from django.db import models
from django.utils.translation import gettext_lazy as _

class School(models.Model):
    name = models.CharField(max_length=255, verbose_name=_("Nom de l'établissement"))
    address = models.TextField(verbose_name=_("Adresse"))
    phone_number = models.CharField(max_length=20, verbose_name=_("Numéro de téléphone"))
    email = models.EmailField(blank=True, null=True, verbose_name=_("Email de contact"))
    logo = models.ImageField(upload_to='schools/', blank=True, null=True, verbose_name=_("Logo"))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = _("Établissement")
        verbose_name_plural = _("Établissements")


class AcademicYear(models.Model):
    name = models.CharField(max_length=20, verbose_name=_("Année Scolaire (ex: 2025-2026)"))
    start_date = models.DateField(verbose_name=_("Date de début"))
    end_date = models.DateField(verbose_name=_("Date de fin"))
    is_active = models.BooleanField(default=False, verbose_name=_("Année en cours"))

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Année Scolaire")
        verbose_name_plural = _("Années Scolaires")


class Cycle(models.Model):
    class CycleChoices(models.TextChoices):
        PRIMAIRE = 'PRIMAIRE', _('Primaire')
        COLLEGE = 'COLLEGE', _('Collège')
        LYCEE = 'LYCEE', _('Lycée')

    name = models.CharField(max_length=20, choices=CycleChoices.choices, verbose_name=_("Nom du cycle"))
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='cycles', verbose_name=_("Établissement"))
    
    def __str__(self):
        return f"{self.get_name_display()} - {self.school.name}"
    
    class Meta:
        verbose_name = _("Cycle")
        verbose_name_plural = _("Cycles")


class ClassRoom(models.Model):
    name = models.CharField(max_length=50, verbose_name=_("Nom de la classe (ex: 6ème A)"))
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name='classes', verbose_name=_("Cycle"))
    capacity = models.PositiveIntegerField(default=30, verbose_name=_("Capacité maximale"))

    def __str__(self):
        return f"{self.name} ({self.cycle.get_name_display()})"
    
    class Meta:
        verbose_name = _("Classe")
        verbose_name_plural = _("Classes")


class SMSLog(models.Model):
    class StatusChoices(models.TextChoices):
        SENT = 'SENT', _('Envoyé')
        FAILED = 'FAILED', _('Échec')
        PENDING = 'PENDING', _('En attente')

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='sms_logs')
    recipient_number = models.CharField(max_length=20)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    sent_at = models.DateTimeField(auto_now_add=True)
    provider_response = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"SMS to {self.recipient_number} - {self.status}"

    class Meta:
        verbose_name = _("Log SMS")
        verbose_name_plural = _("Logs SMS")

