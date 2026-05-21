from rest_framework import serializers
from .models import Term, Assessment, Grade, ReportCard

class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = '__all__'

class AssessmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='allocation.subject.name')
    classroom_name = serializers.ReadOnlyField(source='allocation.classroom.name')
    classroom_id = serializers.ReadOnlyField(source='allocation.classroom.id')  # Nécessaire pour la saisie des notes

    class Meta:
        model = Assessment
        fields = '__all__'

class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='enrollment.student.get_full_name')
    assessment_title = serializers.ReadOnlyField(source='assessment.title')

    class Meta:
        model = Grade
        fields = '__all__'

class ReportCardSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='enrollment.student.get_full_name')
    term_name = serializers.ReadOnlyField(source='term.name')
    classroom_name = serializers.ReadOnlyField(source='enrollment.classroom.name')

    class Meta:
        model = ReportCard
        fields = '__all__'
