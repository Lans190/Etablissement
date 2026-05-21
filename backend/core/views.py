from rest_framework import viewsets, permissions
from .models import School, Cycle, AcademicYear, ClassRoom
from .serializers import SchoolSerializer, CycleSerializer, AcademicYearSerializer, ClassRoomSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Seuls les administrateurs et la direction peuvent modifier. Les autres peuvent seulement lire.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION']

class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAdminOrReadOnly]

class CycleViewSet(viewsets.ModelViewSet):
    queryset = Cycle.objects.all()
    serializer_class = CycleSerializer
    permission_classes = [IsAdminOrReadOnly]

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdminOrReadOnly]

class ClassRoomViewSet(viewsets.ModelViewSet):
    queryset = ClassRoom.objects.all()
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAdminOrReadOnly]

from .models import SMSLog
from .serializers import SMSLogSerializer
from .sms_service import SMSService
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class SMSLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SMSLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return SMSLog.objects.filter(school=user.school).order_by('-sent_at')
        return SMSLog.objects.none()

class SendBulkSMSView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['ADMIN', 'DIRECTION']:
            return Response({"error": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
            
        school = request.user.school
        if not school:
            return Response({"error": "Utilisateur non associé à une école"}, status=status.HTTP_400_BAD_REQUEST)
            
        recipients = request.data.get('recipients', [])
        message = request.data.get('message')
        
        if not recipients or not message:
            return Response({"error": "Données incomplètes"}, status=status.HTTP_400_BAD_REQUEST)
            
        results = SMSService.send_bulk_sms(school, recipients, message)
        return Response({"status": "success", "sent_count": len(results)})

from django.db.models import Sum, Count, Avg, Q
from students.models import Enrollment
from finance.models import Payment
from academics.models import SubjectAllocation

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        school = user.school
        
        if not school:
            return Response({"error": "No school found"}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        from finance.models import Payment, Expense

        # 1. Chiffres Globaux
        total_students = Enrollment.objects.filter(classroom__cycle__school=school, is_active=True).count()
        total_teachers = User.objects.filter(school=school, role='ENSEIGNANT').count()
        total_classes = ClassRoom.objects.filter(cycle__school=school).count()
        
        # 2. Établissement par Cycle (Élèves et Enseignants)
        cycles_stats = []
        cycles = Cycle.objects.filter(school=school)
        for cycle in cycles:
            student_count = Enrollment.objects.filter(classroom__cycle=cycle, is_active=True).count()
            # On considère un enseignant comme faisant partie d'un cycle s'il a au moins une allocation dans ce cycle
            teacher_count = User.objects.filter(
                role='ENSEIGNANT',
                allocations__classroom__cycle=cycle
            ).distinct().count()
            
            cycles_stats.append({
                "name": cycle.get_name_display(),
                "students": student_count,
                "teachers": teacher_count
            })

        # 3. Élèves par Classe (Top 5 ou toutes)
        classes_stats = ClassRoom.objects.filter(cycle__school=school).annotate(
            student_count=Count('enrollments', filter=Q(enrollments__is_active=True))
        ).values('name', 'student_count')

        # 4. Finance (Bilan Mensuel)
        # On calcule les entrées (Payments) et sorties (Expenses)
        total_revenue = Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=school
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        total_expenses = Expense.objects.filter(school=school).aggregate(total=Sum('amount'))['total'] or 0
        
        # Activité récente
        recent_payments = Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=school
        ).order_by('-payment_date')[:5]
        
        from finance.serializers import PaymentSerializer
        recent_payments_data = PaymentSerializer(recent_payments, many=True).data

        return Response({
            "stats": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_classes": total_classes,
                "balance": float(total_revenue - total_expenses),
                "revenue": float(total_revenue),
                "expenses": float(total_expenses)
            },
            "cycles": cycles_stats,
            "classes": list(classes_stats),
            "recent_payments": recent_payments_data
        })
