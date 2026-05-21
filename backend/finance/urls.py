from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeTypeViewSet, FeeAllocationViewSet, PaymentViewSet, ExpenseViewSet, IncomeViewSet

router = DefaultRouter()
router.register(r'fee-types', FeeTypeViewSet, basename='fee-types')
router.register(r'allocations', FeeAllocationViewSet, basename='fee-allocations')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'expenses', ExpenseViewSet, basename='expenses')
router.register(r'incomes', IncomeViewSet, basename='incomes')

urlpatterns = [
    path('', include(router.urls)),
]
