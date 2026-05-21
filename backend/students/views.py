from rest_framework import viewsets, permissions, status
import random
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Enrollment, Attendance
from .serializers import EnrollmentSerializer, AttendanceSerializer

class IsAdminOrTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION', 'ENSEIGNANT']

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Enrollment.objects.all()
        
        classroom_id = self.request.query_params.get('classroom')
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        if user.role == 'ELEVE':
            return queryset.filter(student=user)
        # TODO: Add logic for PARENT role
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
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAdminOrTeacher]

    def perform_create(self, serializer):
        attendance = serializer.save(recorded_by=self.request.user)
        
        # Envoi de SMS en cas d'absence
        if attendance.status == 'ABSENT':
            student = attendance.enrollment.student
            school = attendance.enrollment.classroom.cycle.school
            parents = student.parents.filter(role='PARENT')
            
            from core.sms_service import SMSService
            message = f"SeneSchool Notification: Votre enfant {student.get_full_name()} est marque absent ce jour {attendance.date}."
            
            for parent in parents:
                if parent.phone_number:
                    SMSService.send_sms(school, parent.phone_number, message)


    def get_queryset(self):
        user = self.request.user
        if user.role == 'ELEVE':
            return Attendance.objects.filter(enrollment__student=user)
        return Attendance.objects.all()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        from django.db.models import Count
        classroom_id = request.query_params.get('classroom')
        date = request.query_params.get('date')
        
        queryset = Attendance.objects.all()
        if classroom_id:
            queryset = queryset.filter(enrollment__classroom_id=classroom_id)
        if date:
            queryset = queryset.filter(date=date)
            
        stats = queryset.values('status').annotate(total=Count('id'))
        return Response(stats)
