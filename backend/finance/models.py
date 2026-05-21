from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from core.models import School, AcademicYear
from students.models import Enrollment

User = get_user_model()

class FeeType(models.Model):
    """Types de frais (Scolarité, Inscription, Transport, Cantine, etc.)"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='fee_types')
    name = models.CharField(max_length=100, verbose_name=_("Nom du frais"))
    default_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Montant par défaut"))
    is_monthly = models.BooleanField(default=True, verbose_name=_("Frais mensuel ?"))

    def __str__(self):
        return f"{self.name} ({self.school.name})"

    class Meta:
        verbose_name = _("Type de Frais")
        verbose_name_plural = _("Types de Frais")

class FeeAllocation(models.Model):
    """Assignation d'un frais à un élève spécifique pour une année donnée"""
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='fee_allocations')
    fee_type = models.ForeignKey(FeeType, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Montant personnalisé"))
    due_date = models.DateField(verbose_name=_("Date d'échéance"))
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.fee_type.name} - {self.enrollment.student.get_full_name()}"

    class Meta:
        verbose_name = _("Frais Alloué")
        verbose_name_plural = _("Frais Alloués")

class Payment(models.Model):
    """Enregistrement d'un paiement effectué par un parent"""
    class MethodChoices(models.TextChoices):
        CASH = 'CASH', _('Espèces')
        WAVE = 'WAVE', _('Wave')
        ORANGE_MONEY = 'ORANGE_MONEY', _('Orange Money')
        BANK = 'BANK', _('Virement Bancaire')

    fee_allocation = models.ForeignKey(FeeAllocation, on_delete=models.CASCADE, related_name='payments')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=MethodChoices.choices, default=MethodChoices.CASH)
    transaction_id = models.CharField(max_length=100, blank=True, null=True, verbose_name=_("ID Transaction (Wave/OM)"))
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_payments')

    def __str__(self):
        return f"Payé {self.amount_paid} pour {self.fee_allocation}"

    class Meta:
        verbose_name = _("Paiement")
        verbose_name_plural = _("Paiements")


class Expense(models.Model):
    """Sorties d'argent / Dépenses de l'établissement"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='expenses')
    title = models.CharField(max_length=200, verbose_name=_("Titre de la dépense"))
    category = models.CharField(max_length=100, blank=True, null=True, verbose_name=_("Catégorie (ex: Salaire, Loyer, Matériel)"))
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name=_("Montant"))
    date = models.DateField(auto_now_add=True, verbose_name=_("Date"))
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.title} - {self.amount} FCFA"

    class Meta:
        verbose_name = _("Dépense")
        verbose_name_plural = _("Dépenses")
        ordering = ['-date']


class Income(models.Model):
    """Entrées d'argent / Recettes générales de l'établissement"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='incomes')
    title = models.CharField(max_length=200, verbose_name=_("Titre de la recette"))
    category = models.CharField(max_length=100, blank=True, null=True, verbose_name=_("Catégorie (ex: Inscription, Cantine, Vente)"))
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name=_("Montant"))
    date = models.DateField(auto_now_add=True, verbose_name=_("Date"))
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.title} - {self.amount} FCFA"

    class Meta:
        verbose_name = _("Recette")
        verbose_name_plural = _("Recettes")
        ordering = ['-date']

