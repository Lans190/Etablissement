from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, CycleViewSet, AcademicYearViewSet, ClassRoomViewSet, SMSLogViewSet, SendBulkSMSView, DashboardStatsView, SchoolEventViewSet, GrokAnalysisView

router = DefaultRouter()
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'cycles', CycleViewSet, basename='cycle')
router.register(r'academic-years', AcademicYearViewSet)
router.register(r'classrooms', ClassRoomViewSet, basename='classroom')
router.register(r'sms/logs', SMSLogViewSet, basename='sms-logs')
router.register(r'events', SchoolEventViewSet, basename='events')

urlpatterns = [
    path('', include(router.urls)),
    path('sms/send-bulk/', SendBulkSMSView.as_view(), name='send-bulk-sms'),
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('grok-analysis/', GrokAnalysisView.as_view(), name='grok-analysis'),
]
