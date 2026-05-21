from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import ClassRoom
from django.contrib.auth import get_user_model

User = get_user_model()

class Subject(models.Model):
    name = models.CharField(max_length=100, verbose_name=_("Nom de la matière"))
    code = models.CharField(max_length=20, blank=True, null=True, verbose_name=_("Code abrégé (ex: MATHS)"))
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Matière")
        verbose_name_plural = _("Matières")


class SubjectAllocation(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='allocations', verbose_name=_("Matière"))
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='subject_allocations', verbose_name=_("Classe"))
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'ENSEIGNANT'}, related_name='allocations', verbose_name=_("Enseignant"))
    coefficient = models.PositiveIntegerField(default=1, verbose_name=_("Coefficient"))

    def __str__(self):
        return f"{self.subject.name} - {self.classroom.name} ({self.teacher.get_full_name()})"
    
    class Meta:
        verbose_name = _("Attribution de Matière")
        verbose_name_plural = _("Attributions de Matières")
        unique_together = ('subject', 'classroom') # Une matière n'est attribuée qu'une fois dans une classe donnée


class DiaryEntry(models.Model):
    class StatusChoices(models.TextChoices):
        DRAFT = 'DRAFT', _('Brouillon')
        PUBLISHED = 'PUBLISHED', _('Publié (Visible par parents/élèves)')

    allocation = models.ForeignKey(SubjectAllocation, on_delete=models.CASCADE, related_name='diary_entries', verbose_name=_("Cours"))
    date = models.DateField(verbose_name=_("Date du cours"))
    title = models.CharField(max_length=200, verbose_name=_("Titre de la leçon / Chapitre"))
    content = models.TextField(verbose_name=_("Contenu du cours dispensé"))
    homework = models.TextField(blank=True, null=True, verbose_name=_("Travail à faire (Devoirs)"))
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.DRAFT, verbose_name=_("Statut"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.date} - {self.allocation.subject.name} ({self.allocation.classroom.name})"
    
    class Meta:
        verbose_name = _("Entrée Cahier de Texte")
        verbose_name_plural = _("Entrées Cahier de Texte")
        ordering = ['-date', '-created_at']


class TimeSlot(models.Model):
    """Créneaux horaires (ex: 08:00 - 09:00)"""
    start_time = models.TimeField(verbose_name=_("Heure de début"))
    end_time = models.TimeField(verbose_name=_("Heure de fin"))

    def __str__(self):
        return f"{self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"

    class Meta:
        verbose_name = _("Créneau Horaire")
        verbose_name_plural = _("Créneaux Horaires")
        ordering = ['start_time']


class TimetableEntry(models.Model):
    """Une case dans l'emploi du temps"""
    class DayChoices(models.TextChoices):
        LUNDI = 'LUNDI', _('Lundi')
        MARDI = 'MARDI', _('Mardi')
        MERCREDI = 'MERCREDI', _('Mercredi')
        JEUDI = 'JEUDI', _('Jeudi')
        VENDREDI = 'VENDREDI', _('Vendredi')
        SAMEDI = 'SAMEDI', _('Samedi')
        DIMANCHE = 'DIMANCHE', _('Dimanche')

    day = models.CharField(max_length=10, choices=DayChoices.choices, verbose_name=_("Jour"))
    timeslot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE, related_name='entries')
    allocation = models.ForeignKey(SubjectAllocation, on_delete=models.CASCADE, related_name='timetable_entries')
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='timetable')

    def __str__(self):
        return f"{self.day} {self.timeslot} - {self.allocation.subject.name} ({self.classroom.name})"

    class Meta:
        verbose_name = _("Entrée Emploi du Temps")
        verbose_name_plural = _("Entrées Emploi du Temps")
        unique_together = ('day', 'timeslot', 'classroom') # Une classe ne peut pas avoir deux cours en même temps


class TeachingPointage(models.Model):
    """Enregistrement de la présence réelle de l'enseignant pour une séance"""
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teaching_pointages', verbose_name=_("Enseignant"))
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, verbose_name=_("Classe enseignée"))
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, verbose_name=_("Matière"))
    date = models.DateField(auto_now_add=True, verbose_name=_("Date"))
    hours_count = models.PositiveIntegerField(default=1, verbose_name=_("Nombre d'heures effectuées"))
    topic = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Chapitre/Sujet abordé"))
    is_validated = models.BooleanField(default=False, verbose_name=_("Validé par l'Admin"))

    def __str__(self):
        return f"{self.teacher.get_full_name()} - {self.date} - {self.hours_count}h"

    class Meta:
        verbose_name = _("Pointage Enseignant")
        verbose_name_plural = _("Pointages Enseignants")
        ordering = ['-date']


class Resource(models.Model):
    """Fichiers et ressources pédagogiques (PDF, images, etc.)"""
    title = models.CharField(max_length=255, verbose_name=_("Titre de la ressource"))
    file = models.FileField(upload_to='resources/', verbose_name=_("Fichier"))
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='resources', verbose_name=_("Classe visée"))
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='resources', verbose_name=_("Matière"))
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resources', verbose_name=_("Partagé par"))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.subject.name})"

    class Meta:
        verbose_name = _("Ressource Pédagogique")
        verbose_name_plural = _("Ressources Pédagogiques")
