from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrateur')
        DIRECTION = 'DIRECTION', _('Direction')
        ENSEIGNANT = 'ENSEIGNANT', _('Enseignant')
        PARENT = 'PARENT', _('Parent')
        ELEVE = 'ELEVE', _('Élève')
        COMPTABLE = 'COMPTABLE', _('Comptable')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ELEVE,
        verbose_name=_("Rôle de l'utilisateur")
    )
    
    # Informations de contact supplémentaires
    phone_number = models.CharField(max_length=20, blank=True, null=True, verbose_name=_("Numéro de téléphone"))
    address = models.TextField(blank=True, null=True, verbose_name=_("Adresse"))
    
    # Photo de profil
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True, verbose_name=_("Photo de profil"))
    
    # Identifiant unique (Matricule)
    matricule = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name=_("Matricule"))

    # CNI (Carte Nationale d'Identité)
    cni_number = models.CharField(max_length=50, blank=True, null=True, verbose_name=_("Numéro de CNI"))
    cni_scan = models.FileField(upload_to='cni_scans/', blank=True, null=True, verbose_name=_("Scan CNI"))

    # Multi-Tenancy : Lier l'utilisateur à une école spécifique
    school = models.ForeignKey('core.School', on_delete=models.CASCADE, null=True, blank=True, related_name='users', verbose_name=_("Établissement"))

    # Lien Parent -> Élève(s)
    children = models.ManyToManyField('self', symmetrical=False, related_name='parents', blank=True, limit_choices_to={'role': 'ELEVE'}, verbose_name=_("Enfants (Élèves)"))

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
