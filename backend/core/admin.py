from django.contrib import admin
from .models import School, AcademicYear, Cycle, ClassRoom

@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_number', 'email', 'created_at')
    search_fields = ('name',)

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active',)

@admin.register(Cycle)
class CycleAdmin(admin.ModelAdmin):
    list_display = ('get_name_display', 'school')
    list_filter = ('name', 'school')

@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'cycle', 'capacity')
    list_filter = ('cycle',)
    search_fields = ('name',)
