from rest_framework import serializers
from .models import Subject, SubjectAllocation, DiaryEntry, TimeSlot, TimetableEntry, TeachingPointage, Resource

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class SubjectAllocationSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    classroom_name = serializers.ReadOnlyField(source='classroom.name')
    teacher_name = serializers.ReadOnlyField(source='teacher.get_full_name')

    class Meta:
        model = SubjectAllocation
        fields = '__all__'

class DiaryEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='allocation.subject.name')
    classroom_name = serializers.ReadOnlyField(source='allocation.classroom.name')
    teacher_name = serializers.ReadOnlyField(source='allocation.teacher.get_full_name')

    class Meta:
        model = DiaryEntry
        fields = '__all__'

class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = '__all__'

class TimetableEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='allocation.subject.name')
    teacher_name = serializers.ReadOnlyField(source='allocation.teacher.get_full_name')
    timeslot_display = serializers.StringRelatedField(source='timeslot')

    class Meta:
        model = TimetableEntry
        fields = '__all__'

class TeachingPointageSerializer(serializers.ModelSerializer):
    teacher_name = serializers.ReadOnlyField(source='teacher.get_full_name')
    classroom_name = serializers.ReadOnlyField(source='classroom.name')
    subject_name = serializers.ReadOnlyField(source='subject.name')

    class Meta:
        model = TeachingPointage
        fields = '__all__'
        read_only_fields = ('teacher',)

class ResourceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.ReadOnlyField(source='teacher.get_full_name')
    classroom_name = serializers.ReadOnlyField(source='classroom.name')
    subject_name = serializers.ReadOnlyField(source='subject.name')

    class Meta:
        model = Resource
        fields = '__all__'
        read_only_fields = ('teacher',)
