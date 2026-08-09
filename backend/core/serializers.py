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
    cycle_name  = serializers.ReadOnlyField(source='cycle.get_name_display')
    level_display  = serializers.ReadOnlyField(source='get_level_display')
    series_display = serializers.ReadOnlyField(source='get_series_display')

    class Meta:
        model = ClassRoom
        fields = '__all__'

from .models import SMSLog

class SMSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSLog
        fields = '__all__'

from .models import SchoolEvent

class SchoolEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.ReadOnlyField(source='get_event_type_display')
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')

    class Meta:
        model = SchoolEvent
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')


from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.ReadOnlyField(source='get_type_display')

    class Meta:
        model = Notification
        fields = '__all__'

