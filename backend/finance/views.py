from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import FeeType, FeeAllocation, Payment
from .serializers import FeeTypeSerializer, FeeAllocationSerializer, PaymentSerializer

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
        
        if not all([classroom_id, fee_type_id, due_date]):
            return Response({"error": "Données manquantes"}, status=400)
            
        from students.models import Enrollment
        from .models import FeeType
        
        fee_type = FeeType.objects.get(id=fee_type_id)
        enrollments = Enrollment.objects.filter(classroom_id=classroom_id, is_active=True)
        
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
                
        return Response({"message": f"{len(allocations)} frais assignés avec succès."}, status=201)

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
        return Income.objects.filter(school=self.request.user.school).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

