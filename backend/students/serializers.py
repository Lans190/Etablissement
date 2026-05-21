from rest_framework import serializers
from .models import Enrollment, Attendance

class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.get_full_name')
    classroom_name = serializers.ReadOnlyField(source='classroom.name')
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')

    class Meta:
        model = Enrollment
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='enrollment.student.get_full_name')
    classroom_name = serializers.ReadOnlyField(source='enrollment.classroom.name')
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.get_full_name')

    class Meta:
        model = Attendance
        fields = '__all__'
