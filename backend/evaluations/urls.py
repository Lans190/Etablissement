from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TermViewSet, AssessmentViewSet, GradeViewSet, ReportCardViewSet

router = DefaultRouter()
router.register(r'terms', TermViewSet, basename='term')
router.register(r'assessments', AssessmentViewSet, basename='assessment')
router.register(r'grades', GradeViewSet, basename='grade')
router.register(r'report-cards', ReportCardViewSet, basename='report-card')

urlpatterns = [
    path('', include(router.urls)),
]
