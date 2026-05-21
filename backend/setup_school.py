import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from core.models import School, Cycle, ClassRoom, AcademicYear

def setup_standard_classes():
    # 1. Créer ou récupérer l'école par défaut
    school, _ = School.objects.get_or_create(
        name="SeneSchool Pilote",
        defaults={"address": "Dakar, Sénégal", "phone_number": "770000000"}
    )

    # 2. Créer l'année académique (sans le champ school qui n'existe pas)
    year, _ = AcademicYear.objects.get_or_create(
        name="2025-2026",
        defaults={
            "is_active": True,
            "start_date": date(2025, 10, 1),
            "end_date": date(2026, 7, 31)
        }
    )

    # 3. Définition des cycles et classes
    # Note: Dans le modèle Cycle, 'name' est le champ qui utilise les choix (PRIMAIRE, COLLEGE, LYCEE)
    structure = {
        'PRIMAIRE': ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
        'COLLEGE': ['6ème', '5ème', '4ème', '3ème'],
        'LYCEE': ['2nde S', '2nde L', '1ère S1', '1ère S2', '1ère L1', '1ère L2', 'Tle S1', 'Tle S2', 'Tle L1', 'Tle L2']
    }

    for cycle_key, classes in structure.items():
        cycle, _ = Cycle.objects.get_or_create(
            school=school,
            name=cycle_key
        )
        
        for class_name in classes:
            ClassRoom.objects.get_or_create(
                cycle=cycle,
                name=class_name
            )

    print("Structure scolaire initialisée avec succès !")

if __name__ == "__main__":
    setup_standard_classes()
