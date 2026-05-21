from rest_framework import serializers
from .models import School, Cycle, AcademicYear, ClassRoom

class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = '__all__'

class CycleSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    
    class Meta:
        model = Cycle
        fields = '__all__'

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'

class ClassRoomSerializer(serializers.ModelSerializer):
    cycle_name = serializers.ReadOnlyField(source='cycle.get_name_display')
    
    class Meta:
        model = ClassRoom
        fields = '__all__'

from .models import SMSLog

class SMSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSLog
        fields = '__all__'
