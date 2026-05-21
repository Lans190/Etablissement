from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, CycleViewSet, AcademicYearViewSet, ClassRoomViewSet, SMSLogViewSet, SendBulkSMSView, DashboardStatsView

router = DefaultRouter()
router.register(r'schools', SchoolViewSet)
router.register(r'cycles', CycleViewSet)
router.register(r'academic-years', AcademicYearViewSet)
router.register(r'classrooms', ClassRoomViewSet)
router.register(r'sms/logs', SMSLogViewSet, basename='sms-logs')

urlpatterns = [
    path('', include(router.urls)),
    path('sms/send-bulk/', SendBulkSMSView.as_view(), name='send-bulk-sms'),
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
