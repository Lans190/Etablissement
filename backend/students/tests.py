from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from academics.models import Subject
from core.models import School, Cycle, ClassRoom, AcademicYear
from students.models import Attendance, Enrollment
from students.views import AttendanceViewSet

User = get_user_model()


class AttendanceSummaryTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(name='École Test', address='Adresse', phone_number='2210000000')
        self.cycle = Cycle.objects.create(name='PRIMAIRE', school=self.school)
        self.classroom = ClassRoom.objects.create(name='CP A', cycle=self.cycle, level='CP', series='AUCUNE')
        self.academic_year = AcademicYear.objects.create(name='2025-2026', start_date=date(2025, 9, 1), end_date=date(2026, 7, 1), is_active=True)
        self.subject = Subject.objects.create(name='Mathématiques')

        self.teacher = User.objects.create_user(username='teacher1', email='teacher1@example.com', password='pass1234', role='ENSEIGNANT', school=self.school)
        self.admin = User.objects.create_user(username='admin1', email='admin1@example.com', password='pass1234', role='ADMIN', school=self.school)
        self.student = User.objects.create_user(username='student1', email='student1@example.com', password='pass1234', role='ELEVE', school=self.school)

        self.enrollment = Enrollment.objects.create(student=self.student, classroom=self.classroom, academic_year=self.academic_year)

        Attendance.objects.create(
            enrollment=self.enrollment,
            date=date.today(),
            status='ABSENT',
            motive='MALADIE',
            comment='Fièvre',
            subject=self.subject,
            is_validated=False,
            recorded_by=self.teacher,
        )
        Attendance.objects.create(
            enrollment=self.enrollment,
            date=date.today() - timedelta(days=1),
            status='PRESENT',
            subject=self.subject,
            recorded_by=self.teacher,
        )

    def test_summary_returns_pending_and_today_absences(self):
        factory = APIRequestFactory()
        request = factory.get('/students/attendance/summary/')
        request.user = self.admin

        view = AttendanceViewSet()
        view.request = request

        response = view.summary(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['pending_absences'], 1)
        self.assertEqual(response.data['today_absences'], 1)
        self.assertEqual(response.data['absent_students_today'], 1)
