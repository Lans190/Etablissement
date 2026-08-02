from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnrollmentViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'attendances', AttendanceViewSet, basename='attendances')

urlpatterns = [
    path('', include(router.urls)),
]
