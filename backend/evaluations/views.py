from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Term, Assessment, Grade, ReportCard
from .serializers import TermSerializer, AssessmentSerializer, GradeSerializer, ReportCardSerializer

class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['ADMIN', 'DIRECTION', 'ENSEIGNANT']

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.none()  # Requis par le router DRF
    serializer_class = TermSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Term.objects.all()

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.none()  # Requis par le router DRF
    serializer_class = AssessmentSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ENSEIGNANT':
            return Assessment.objects.filter(allocation__teacher=user).order_by('-date')
        elif user.role == 'ELEVE':
            from students.models import Enrollment
            enrollment = Enrollment.objects.filter(student=user).first()
            if enrollment:
                return Assessment.objects.filter(allocation__classroom=enrollment.classroom).order_by('-date')
            return Assessment.objects.none()
        if user.school:
            return Assessment.objects.filter(
                allocation__classroom__cycle__school=user.school
            ).order_by('-date')
        return Assessment.objects.all().order_by('-date')

class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsTeacherOrAdmin]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        assessment_id = request.data.get('assessment_id')
        grades_data = request.data.get('grades', [])
        
        results = []
        for item in grades_data:
            enrollment_id = item.get('enrollment_id')
            score = item.get('score')
            comments = item.get('comments', '')
            
            grade, created = Grade.objects.update_or_create(
                assessment_id=assessment_id,
                enrollment_id=enrollment_id,
                defaults={
                    'score': score,
                    'comments': comments,
                    'recorded_by': self.request.user
                }
            )
            results.append(grade.id)
            
        return Response({"status": "success", "updated_count": len(results)})

class ReportCardViewSet(viewsets.ModelViewSet):
    queryset = ReportCard.objects.all()
    serializer_class = ReportCardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ELEVE':
            return ReportCard.objects.filter(enrollment__student=user, is_published=True)
        return ReportCard.objects.all()

    @action(detail=False, methods=['post'], url_path='generate-reports')
    def generate_reports(self, request):
        classroom_id = request.data.get('classroom_id')
        term_id = request.data.get('term_id')
        
        from students.models import Enrollment
        enrollments = Enrollment.objects.filter(classroom_id=classroom_id)
        
        created_count = 0
        for enrollment in enrollments:
            report, created = ReportCard.objects.get_or_create(
                enrollment=enrollment,
                term_id=term_id,
                defaults={'is_published': False}
            )
            created_count += 1
            
        return Response({"status": "success", "message": f"{created_count} bulletins initialisés."})

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        from .utils import generate_report_card_pdf
        from django.http import HttpResponse
        
        report_card = self.get_object()
        pdf_buffer = generate_report_card_pdf(report_card)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        filename = f"Bulletin_{report_card.enrollment.student.last_name}_{report_card.term.name}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
