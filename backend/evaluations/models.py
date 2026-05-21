from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import AcademicYear, ClassRoom
from academics.models import SubjectAllocation
from students.models import Enrollment
from django.contrib.auth import get_user_model

User = get_user_model()

class Term(models.Model):
    name = models.CharField(max_length=50, verbose_name=_("Nom (ex: Trimestre 1, Semestre 1)"))
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='terms', verbose_name=_("Année Scolaire"))
    start_date = models.DateField(verbose_name=_("Date de début"))
    end_date = models.DateField(verbose_name=_("Date de fin"))

    def __str__(self):
        return f"{self.name} ({self.academic_year.name})"
    
    class Meta:
        verbose_name = _("Période (Trimestre/Semestre)")
        verbose_name_plural = _("Périodes")


class Assessment(models.Model):
    class TypeChoices(models.TextChoices):
        DEVOIR = 'DEVOIR', _('Devoir')
        COMPOSITION = 'COMPOSITION', _('Composition')
        EXAMEN = 'EXAMEN', _('Examen')

    title = models.CharField(max_length=150, verbose_name=_("Titre de l'évaluation"))
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='assessments', verbose_name=_("Période"))
    allocation = models.ForeignKey(SubjectAllocation, on_delete=models.CASCADE, related_name='assessments', verbose_name=_("Matière/Classe"))
    type = models.CharField(max_length=20, choices=TypeChoices.choices, default=TypeChoices.DEVOIR, verbose_name=_("Type"))
    date = models.DateField(verbose_name=_("Date de l'évaluation"))
    max_score = models.FloatField(default=20.0, verbose_name=_("Note sur (ex: 20)"))
    weight = models.FloatField(default=1.0, verbose_name=_("Poids de cette évaluation"))

    def __str__(self):
        return f"{self.title} - {self.allocation.subject.name} - {self.allocation.classroom.name}"
    
    class Meta:
        verbose_name = _("Évaluation")
        verbose_name_plural = _("Évaluations")


class Grade(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='grades', verbose_name=_("Évaluation"))
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='grades', verbose_name=_("Élève inscrit"))
    score = models.FloatField(blank=True, null=True, verbose_name=_("Note obtenue"))
    comments = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Appréciation"))
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name=_("Saisie par"))

    def __str__(self):
        return f"{self.enrollment.student.get_full_name()} - {self.assessment.title}: {self.score}/{self.assessment.max_score}"
    
    class Meta:
        verbose_name = _("Note")
        verbose_name_plural = _("Notes")
        unique_together = ('assessment', 'enrollment') # Une seule note par élève pour une évaluation spécifique


class ReportCard(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='report_cards', verbose_name=_("Élève inscrit"))
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='report_cards', verbose_name=_("Période"))
    general_average = models.FloatField(blank=True, null=True, verbose_name=_("Moyenne générale"))
    rank = models.PositiveIntegerField(blank=True, null=True, verbose_name=_("Rang de l'élève"))
    teacher_comments = models.TextField(blank=True, null=True, verbose_name=_("Appréciation du titulaire"))
    headmaster_comments = models.TextField(blank=True, null=True, verbose_name=_("Appréciation du directeur"))
    is_published = models.BooleanField(default=False, verbose_name=_("Publié (Visible par parents/élèves)"))
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Bulletin {self.term.name} - {self.enrollment.student.get_full_name()}"
    
    class Meta:
        verbose_name = _("Bulletin")
        verbose_name_plural = _("Bulletins")
        unique_together = ('enrollment', 'term')
