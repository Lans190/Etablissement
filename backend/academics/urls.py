from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, SubjectAllocationViewSet, DiaryEntryViewSet, TimeSlotViewSet, TimetableEntryViewSet, TeachingPointageViewSet, ResourceViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'allocations', SubjectAllocationViewSet, basename='allocation')
router.register(r'diary', DiaryEntryViewSet, basename='diary')
router.register(r'timeslots', TimeSlotViewSet, basename='timeslot')
router.register(r'timetable', TimetableEntryViewSet, basename='timetable')
router.register(r'pointages', TeachingPointageViewSet, basename='pointage')
router.register(r'resources', ResourceViewSet, basename='resource')

urlpatterns = [
    path('', include(router.urls)),
]
