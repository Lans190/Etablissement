from rest_framework import serializers
from .models import FeeType, FeeAllocation, Payment, Income

class FeeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeType
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.get_full_name')
    
    class Meta:
        model = Payment
        fields = '__all__'

class FeeAllocationSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    student_name = serializers.ReadOnlyField(source='enrollment.student.get_full_name')
    classroom_name = serializers.ReadOnlyField(source='enrollment.classroom.name')
    payments = PaymentSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = FeeAllocation
        fields = '__all__'

    def get_total_paid(self, obj):
        return sum(p.amount_paid for p in obj.payments.all())

    def get_balance(self, obj):
        return obj.amount - self.get_total_paid(obj)

from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('school',)


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = '__all__'
        read_only_fields = ('school',)

