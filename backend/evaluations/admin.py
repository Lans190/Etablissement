from django.contrib import admin
from .models import Term, Assessment, Grade, ReportCard

@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ('name', 'academic_year', 'start_date', 'end_date')
    list_filter = ('academic_year',)

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'term', 'allocation', 'type', 'date', 'max_score')
    list_filter = ('term', 'type', 'allocation')
    search_fields = ('title',)

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('assessment', 'enrollment', 'score', 'recorded_by')
    list_filter = ('assessment',)
    search_fields = ('enrollment__student__first_name', 'enrollment__student__last_name')

@admin.register(ReportCard)
class ReportCardAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'term', 'general_average', 'rank', 'is_published')
    list_filter = ('term', 'is_published')
    search_fields = ('enrollment__student__first_name', 'enrollment__student__last_name')
