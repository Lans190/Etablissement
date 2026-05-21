from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from core.models import ClassRoom, AcademicYear

User = get_user_model()

class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'ELEVE'}, related_name='enrollments', verbose_name=_("Élève"))
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='enrollments', verbose_name=_("Classe"))
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='enrollments', verbose_name=_("Année Scolaire"))
    enrollment_date = models.DateField(auto_now_add=True, verbose_name=_("Date d'inscription"))
    is_active = models.BooleanField(default=True, verbose_name=_("Actif"))

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.classroom.name} ({self.academic_year.name})"
    
    class Meta:
        verbose_name = _("Inscription")
        verbose_name_plural = _("Inscriptions")
        unique_together = ('student', 'academic_year') # Un élève ne peut être inscrit qu'à une seule classe par année scolaire


class Attendance(models.Model):
    class StatusChoices(models.TextChoices):
        PRESENT = 'PRESENT', _('Présent')
        ABSENT = 'ABSENT', _('Absent')
        LATE = 'LATE', _('En retard')

    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='attendances', verbose_name=_("Élève inscrit"))
    date = models.DateField(verbose_name=_("Date"))
    status = models.CharField(max_length=10, choices=StatusChoices.choices, default=StatusChoices.PRESENT, verbose_name=_("Statut"))
    justification = models.TextField(blank=True, null=True, verbose_name=_("Justification (si absent/retard)"))
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_attendances', verbose_name=_("Enregistré par"))

    def __str__(self):
        return f"{self.enrollment.student.get_full_name()} - {self.date} - {self.get_status_display()}"
    
    class Meta:
        verbose_name = _("Pointage")
        verbose_name_plural = _("Pointages")
        unique_together = ('enrollment', 'date') # Un seul pointage global par jour pour l'instant (peut être affiné par matière plus tard)
