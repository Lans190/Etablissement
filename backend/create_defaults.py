import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from core.models import School
from academics.models import Subject
from finance.models import FeeType

def create_defaults():
    school = School.objects.first()
    if not school:
        print("Aucun établissement trouvé.")
        return

    print("Création des matières par défaut...")
    subjects = [
        ("Mathématiques", "MATH", "Cours standard de Mathématiques"),
        ("Français", "FRAN", "Cours de Langue et Littérature Françaises"),
        ("Anglais", "ANGL", "Cours d'Anglais"),
        ("Sciences de la Vie et de la Terre", "SVT", "Cours de SVT"),
        ("Physique-Chimie", "PHYS", "Cours de Physique et Chimie"),
        ("Histoire-Géographie", "HG", "Cours d'Histoire et Géographie"),
    ]
    for name, code, desc in subjects:
        sub, created = Subject.objects.get_or_create(
            name=name,
            defaults={"code": code, "description": desc}
        )
        if created:
            print(f"Matière créée : {name}")

    print("Création des types de frais par défaut...")
    fees = [
        ("Frais d'Inscription", 50000, False),
        ("Mensualité Scolaire", 30000, True),
        ("Frais de Cantine", 15000, True),
        ("Frais de Transport", 20000, True)
    ]
    for name, amount, monthly in fees:
        ft, created = FeeType.objects.get_or_create(
            school=school,
            name=name,
            defaults={"default_amount": amount, "is_monthly": monthly}
        )
        if created:
            print(f"Type de frais créé : {name} ({amount} F)")

    print("Création des valeurs par défaut terminée !")

if __name__ == "__main__":
    create_defaults()
