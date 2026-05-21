from django.contrib import admin
from .models import Enrollment, Attendance

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'classroom', 'academic_year', 'is_active')
    list_filter = ('academic_year', 'classroom', 'is_active')
    search_fields = ('student__first_name', 'student__last_name', 'student__username')

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'date', 'status', 'recorded_by')
    list_filter = ('status', 'date')
    search_fields = ('enrollment__student__first_name', 'enrollment__student__last_name')
