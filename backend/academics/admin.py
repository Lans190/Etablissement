from django.contrib import admin
from .models import Subject, SubjectAllocation, DiaryEntry

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')
    search_fields = ('name', 'code')

@admin.register(SubjectAllocation)
class SubjectAllocationAdmin(admin.ModelAdmin):
    list_display = ('subject', 'classroom', 'teacher', 'coefficient')
    list_filter = ('subject', 'classroom', 'teacher')

@admin.register(DiaryEntry)
class DiaryEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'allocation', 'title', 'status')
    list_filter = ('status', 'date')
    search_fields = ('title', 'content')
