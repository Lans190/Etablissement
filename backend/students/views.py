from rest_framework import viewsets, permissions, status
import random
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, Sum
from .models import Enrollment, Attendance
from .serializers import EnrollmentSerializer, AttendanceSerializer

class IsAdminOrTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION', 'ENSEIGNANT']

class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Enrollment.objects.none()
            
        queryset = Enrollment.objects.all()
        
        classroom_id = self.request.query_params.get('classroom')
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        if user.role == 'ELEVE':
            return queryset.filter(student=user)
        elif user.role == 'PARENT':
            return queryset.filter(student__parents=user)
        elif user.school:
            return queryset.filter(classroom__cycle__school=user.school)
        return queryset

    @action(detail=True, methods=['get'])
    def id_card(self, request, pk=None):
        enrollment = self.get_object()
        from .utils import generate_student_id_card_pdf
        from django.http import HttpResponse
        
        pdf = generate_student_id_card_pdf(enrollment)
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="carte_scolaire_{enrollment.student.id}.pdf"'
        return response

    @action(detail=False, methods=['post'])
    def register_student(self, request):
        from django.db import transaction
        from django.contrib.auth import get_user_model
        from core.models import School, AcademicYear, ClassRoom
        
        User = get_user_model()
        data = request.data
        
        try:
            with transaction.atomic():
                # 1. Créer l'utilisateur
                email = data.get('email', f"student_{data.get('first_name')}_{data.get('last_name')}_{random.randint(100, 999)}@seneschool.com").lower()
                
                # Génération du matricule
                school_id = request.user.school_id
                matricule = data.get('matricule')
                if not matricule:
                    count = User.objects.filter(school_id=school_id).count() + 1
                    year = AcademicYear.objects.filter(is_active=True).first().name.split('-')[0]
                    matricule = f"SN-{year}-{count:04d}"

                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': email,
                        'first_name': data.get('first_name'),
                        'last_name': data.get('last_name'),
                        'role': 'ELEVE',
                        'phone_number': data.get('phone_number'),
                        'school_id': school_id,
                        'matricule': matricule
                    }
                )
                
                if created:
                    user.set_password('SeneSchool123!')
                    if 'profile_picture' in request.FILES:
                        user.profile_picture = request.FILES['profile_picture']
                    user.save()

                # 2. Inscrire à la classe
                academic_year = AcademicYear.objects.filter(is_active=True).first()
                if not academic_year:
                    return Response({"error": "Aucune année académique active trouvée."}, status=status.HTTP_400_BAD_REQUEST)
                
                enrollment, e_created = Enrollment.objects.get_or_create(
                    student=user,
                    academic_year=academic_year,
                    defaults={'classroom_id': data.get('classroom')}
                )
                
                return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAdminOrTeacher]

    def perform_create(self, serializer):
        attendance = serializer.save(recorded_by=self.request.user)

        if attendance.status == 'ABSENT':
            student = attendance.enrollment.student
            school = attendance.enrollment.classroom.cycle.school
            parents = student.parents.filter(role='PARENT')

            from core.sms_service import SMSService
            message = (
                f"SeneSchool Notification: Votre enfant {student.get_full_name()} est marqué absent "
                f"le {attendance.date} pour {attendance.subject.name if attendance.subject else 'la journée'}."
            )

            for parent in parents:
                if parent.phone_number:
                    SMSService.send_sms(school, parent.phone_number, message)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Attendance.objects.none()

        queryset = Attendance.objects.all().select_related('enrollment__student', 'enrollment__classroom', 'recorded_by', 'subject')
        query_params = getattr(self.request, 'query_params', self.request.GET)

        classroom_id = query_params.get('classroom')
        if classroom_id:
            queryset = queryset.filter(enrollment__classroom_id=classroom_id)

        date = query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)

        month = query_params.get('month')
        if month:
            queryset = queryset.filter(date__month=month)

        year = query_params.get('year')
        if year:
            queryset = queryset.filter(date__year=year)

        if user.role == 'ELEVE':
            return queryset.filter(enrollment__student=user)
        elif user.role == 'PARENT':
            return queryset.filter(enrollment__student__parents=user)
        elif user.school:
            return queryset.filter(enrollment__classroom__cycle__school=user.school)
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        from datetime import date as dt_date

        query_params = getattr(request, 'query_params', request.GET)
        classroom_id = query_params.get('classroom')
        date_param = query_params.get('date')
        month = query_params.get('month')
        year = query_params.get('year')

        queryset = self.get_queryset()
        if classroom_id:
            queryset = queryset.filter(enrollment__classroom_id=classroom_id)
        if date_param:
            queryset = queryset.filter(date=date_param)
        else:
            queryset = queryset.filter(date=dt_date.today())
        if month:
            queryset = queryset.filter(date__month=month)
        if year:
            queryset = queryset.filter(date__year=year)

        stats = queryset.values('status').annotate(total=Count('id'))
        pending_absences = queryset.filter(status='ABSENT', is_validated=False).count()
        today_absences = queryset.filter(status='ABSENT').count()
        absent_students_today = queryset.filter(status='ABSENT').values('enrollment').distinct().count()
        classes_affected = list(queryset.filter(status='ABSENT').values_list('enrollment__classroom__name', flat=True).distinct())
        recorded_by = list(queryset.filter(status='ABSENT').values_list('recorded_by__first_name', 'recorded_by__last_name').distinct())
        attendance_rate = 100 if queryset.count() == 0 else round((queryset.filter(status='PRESENT').count() / queryset.count()) * 100, 2)

        return Response({
            'stats': list(stats),
            'pending_absences': pending_absences,
            'today_absences': today_absences,
            'absent_students_today': absent_students_today,
            'classes_affected': classes_affected,
            'recorded_by': [{'first_name': first_name, 'last_name': last_name} for first_name, last_name in recorded_by],
            'attendance_rate': attendance_rate,
        })

    @action(detail=True, methods=['patch'])
    def validate(self, request, pk=None):
        attendance = self.get_object()
        if request.user.role not in ['ADMIN', 'DIRECTION']:
            return Response({'detail': 'Seul l’administration peut valider une absence.'}, status=status.HTTP_403_FORBIDDEN)

        attendance.is_validated = request.data.get('is_validated', True)
        attendance.observation = request.data.get('observation', attendance.observation)
        attendance.save(update_fields=['is_validated', 'observation'])
        return Response(AttendanceSerializer(attendance).data)

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        from django.http import HttpResponse
        from .utils import generate_attendance_report_pdf
        
        # Obtenir les absences filtrées selon les permissions de l'utilisateur
        queryset = self.get_queryset()
        
        # Filtres supplémentaires
        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
            
        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        student_id = request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(enrollment__student_id=student_id)

        # Récupérer l'établissement
        user = request.user
        school = user.school
        if not school:
            from core.models import School
            school = School.objects.first()
            
        if not school:
            return Response({"error": "Établissement non trouvé."}, status=status.HTTP_404_NOT_FOUND)
            
        classroom_name = None
        classroom_id = request.query_params.get('classroom')
        if classroom_id:
            from core.models import ClassRoom
            try:
                classroom_name = ClassRoom.objects.get(id=classroom_id).name
            except ClassRoom.DoesNotExist:
                pass
                
        student_name = None
        if student_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                student_name = User.objects.get(id=student_id).get_full_name()
            except User.DoesNotExist:
                pass

        pdf = generate_attendance_report_pdf(
            school=school,
            attendances=list(queryset.select_related('enrollment__student', 'enrollment__classroom', 'subject')),
            classroom_name=classroom_name,
            student_name=student_name,
            start_date=start_date,
            end_date=end_date
        )
        
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="rapport_absences.pdf"'
        return response
