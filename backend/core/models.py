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
    """Classe scolaire avec niveau et série pour le système éducatif sénégalais"""

    class LevelChoices(models.TextChoices):
        # Primaire (Élémentaire)
        CI   = 'CI',   _('CI (Cours Initiation)')
        CP   = 'CP',   _('CP (Cours Préparatoire)')
        CE1  = 'CE1',  _('CE1 (Cours Élémentaire 1)')
        CE2  = 'CE2',  _('CE2 (Cours Élémentaire 2)')
        CM1  = 'CM1',  _('CM1 (Cours Moyen 1)')
        CM2  = 'CM2',  _('CM2 (Cours Moyen 2)')
        # Collège (Moyen)
        SIXIEME   = '6EME',  _('6ème')
        CINQUIEME = '5EME',  _('5ème')
        QUATRIEME = '4EME',  _('4ème')
        TROISIEME = '3EME',  _('3ème')
        # Lycée (Secondaire)
        SECONDE    = 'SECONDE',    _('Seconde')
        PREMIERE   = 'PREMIERE',   _('1ère')
        TERMINALE  = 'TERMINALE',  _('Terminale')

    class SeriesChoices(models.TextChoices):
        # Séries scientifiques
        S1   = 'S1',   _('S1 (Maths-Sciences Physiques)')
        S2   = 'S2',   _('S2 (Sciences Naturelles)')
        S3   = 'S3',   _('S3 (Sciences et Technologies)')
        # Séries littéraires / sociales
        L1   = 'L1',   _('L1 (Lettres & Sciences Humaines)')
        L2   = 'L2',   _('L2 (Arabe & Sciences Humaines)')
        # Séries techniques
        S4   = 'S4',   _('S4 (Sciences et Technologies Industrielles)')
        STEG = 'STEG', _('STEG (Sciences et Technologies Éco. & Gestion)')
        G    = 'G',    _('G (Gestion)')
        # Pas de série (Primaire / Collège)
        AUCUNE = 'AUCUNE', _('Aucune (Primaire / Collège)')

    name   = models.CharField(max_length=50, verbose_name=_("Nom de la classe (ex: 6ème A)"))
    cycle  = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name='classes', verbose_name=_("Cycle"))
    level  = models.CharField(
        max_length=10,
        choices=LevelChoices.choices,
        blank=True, null=True,
        verbose_name=_("Niveau")
    )
    series = models.CharField(
        max_length=10,
        choices=SeriesChoices.choices,
        default=SeriesChoices.AUCUNE,
        verbose_name=_("Série (Lycée)")
    )
    capacity = models.PositiveIntegerField(default=30, verbose_name=_("Capacité maximale"))

    def __str__(self):
        label = self.name
        if self.level:
            label += f" – {self.get_level_display()}"
        if self.series and self.series != 'AUCUNE':
            label += f" [{self.series}]"
        return f"{label} ({self.cycle.get_name_display()})"

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

