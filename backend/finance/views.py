from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import FeeType, FeeAllocation, Payment
from .serializers import FeeTypeSerializer, FeeAllocationSerializer, PaymentSerializer
from core.models import School


class FinancePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION', 'COMPTABLE']

class FeeTypeViewSet(viewsets.ModelViewSet):
    serializer_class = FeeTypeSerializer
    permission_classes = [FinancePermission]

    def get_queryset(self):
        return FeeType.objects.filter(school=self.request.user.school)

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

class FeeAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = FeeAllocationSerializer
    permission_classes = [FinancePermission]

    def get_queryset(self):
        return FeeAllocation.objects.filter(
            enrollment__classroom__cycle__school=self.request.user.school
        ).select_related('enrollment__student', 'fee_type').prefetch_related('payments')

    @action(detail=False, methods=['post'])
    def assign_to_class(self, request):
        classroom_id = request.data.get('classroom_id')
        fee_type_id = request.data.get('fee_type_id')
        due_date = request.data.get('due_date')

        # Convert to int if provided as string (from HTML select)
        try:
            classroom_id = int(classroom_id) if classroom_id else None
            fee_type_id = int(fee_type_id) if fee_type_id else None
        except (ValueError, TypeError):
            classroom_id = None
            fee_type_id = None
        
        if not all([classroom_id, fee_type_id, due_date]):
            return Response({"error": "Données manquantes (classe, type de frais et date d'échéance obligatoires)"}, status=400)
            
        from students.models import Enrollment
        from .models import FeeType
        
        try:
            fee_type = FeeType.objects.get(id=fee_type_id, school=request.user.school)
        except FeeType.DoesNotExist:
            return Response({"error": "Type de frais introuvable"}, status=404)

        enrollments = Enrollment.objects.filter(classroom_id=classroom_id, is_active=True)

        if not enrollments.exists():
            return Response({"error": "Aucun élève inscrit actif dans cette classe"}, status=400)
        
        allocations = []
        for enroll in enrollments:
            alloc, created = FeeAllocation.objects.get_or_create(
                enrollment=enroll,
                fee_type=fee_type,
                defaults={
                    'amount': fee_type.default_amount,
                    'due_date': due_date
                }
            )
            if created:
                allocations.append(alloc)
                
        return Response({"message": f"{len(allocations)} frais assignés avec succès. ({enrollments.count() - len(allocations)} déjà existants)"}, status=201)

from .utils import generate_payment_receipt_pdf
from django.http import HttpResponse

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [FinancePermission]

    def get_queryset(self):
        return Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=self.request.user.school
        ).order_by('-payment_date')

    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user)
        # Vérifier si l'allocation est totalement payée
        allocation = payment.fee_allocation
        total_paid = sum(p.amount_paid for p in allocation.payments.all())
        if total_paid >= allocation.amount:
            allocation.is_paid = True
            allocation.save()

    @action(detail=True, methods=['get'])
    def receipt_pdf(self, request, pk=None):
        payment = self.get_object()
        pdf = generate_payment_receipt_pdf(payment)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Recu_{payment.id}.pdf"'
        response.write(pdf)
        return response

from .models import Expense, Income
from .serializers import ExpenseSerializer, IncomeSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [FinancePermission]

    def get_queryset(self):
        return Expense.objects.filter(school=self.request.user.school).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)


class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer
    permission_classes = [FinancePermission]

    def get_queryset(self):
        school = self.request.user.school or School.objects.first()
        return Income.objects.filter(school=school).order_by('-date')

    def perform_create(self, serializer):
        school = self.request.user.school or School.objects.first()
        serializer.save(school=school)


from .models import Payslip
from .serializers import PayslipSerializer

class PayslipViewSet(viewsets.ModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        school = user.school or School.objects.first()
        if user.role == 'ENSEIGNANT':
            return Payslip.objects.filter(teacher=user).order_by('-year', '-month')
        if school:
            return Payslip.objects.filter(school=school).order_by('-year', '-month')
        return Payslip.objects.none()

    def perform_create(self, serializer):
        school = self.request.user.school or School.objects.first()
        serializer.save(school=school)

    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        if request.user.role not in ['ADMIN', 'DIRECTION', 'COMPTABLE']:
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

        month = request.data.get('month')
        year = request.data.get('year')

        try:
            month = int(month)
            year = int(year)
        except (TypeError, ValueError):
            from django.utils import timezone
            now = timezone.now()
            month = now.month
            year = now.year

        school = request.user.school or School.objects.first()
        if not school:
            return Response({"error": "Aucun établissement trouvé"}, status=400)

        from django.contrib.auth import get_user_model
        from academics.models import TeachingPointage
        from django.db.models import Sum

        User = get_user_model()
        teachers = User.objects.filter(school=school, role='ENSEIGNANT')

        created_count = 0
        for teacher in teachers:
            # Calculer les heures validées du mois
            hours_sum = TeachingPointage.objects.filter(
                teacher=teacher,
                date__month=month,
                date__year=year,
                status='VALIDATED'
            ).aggregate(total=Sum('hours_count'))['total'] or 0

            hourly_rate = float(teacher.hourly_rate or 0)
            base_sal = float(teacher.base_salary or 0)

            payslip, created = Payslip.objects.get_or_create(
                school=school,
                teacher=teacher,
                month=month,
                year=year,
                defaults={
                    'hours_worked': float(hours_sum),
                    'hourly_rate': hourly_rate,
                    'base_salary': base_sal,
                    'is_paid': False
                }
            )

            if not created:
                payslip.hours_worked = float(hours_sum)
                payslip.hourly_rate = hourly_rate
                payslip.base_salary = base_sal
                payslip.save()

            created_count += 1

            # Notification pour l'enseignant
            try:
                from core.views import create_notification
                create_notification(
                    school=school,
                    title=f"Fiche de paie disponible ({month}/{year})",
                    message=f"Votre fiche de paie pour {month}/{year} a été générée ({payslip.net_salary} FCFA).",
                    type="FINANCE",
                    user=teacher
                )
            except Exception:
                pass

        return Response({
            "message": f"{created_count} fiches de paie générées/actualisées avec succès pour {month}/{year}.",
            "month": month,
            "year": year
        })

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        payslip = self.get_object()
        from .utils import generate_payslip_pdf
        pdf_bytes = generate_payslip_pdf(payslip)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="bulletin_paie_{payslip.teacher.last_name}_{payslip.month}_{payslip.year}.pdf"'
        return response

    @action(detail=False, methods=['get'])
    def export_payroll_journal_pdf(self, request):
        if request.user.role not in ['ADMIN', 'DIRECTION', 'COMPTABLE']:
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

        month = request.query_params.get('month')
        year = request.query_params.get('year')

        try:
            month = int(month)
            year = int(year)
        except (TypeError, ValueError):
            from django.utils import timezone
            now = timezone.now()
            month = now.month
            year = now.year

        school = request.user.school or School.objects.first()
        queryset = self.get_queryset().filter(month=month, year=year)

        from .utils import generate_payroll_journal_pdf
        pdf_bytes = generate_payroll_journal_pdf(queryset, month, year, school)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="journal_de_paie_{month}_{year}.pdf"'
        return response



