import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from core.models import School, Cycle

def run():
    schools = School.objects.all()
    print(f"Initialisation des cycles pour {schools.count()} établissement(s)...")
    for school in schools:
        for cycle_name in ['PRIMAIRE', 'COLLEGE', 'LYCEE']:
            cycle, created = Cycle.objects.get_or_create(school=school, name=cycle_name)
            if created:
                print(f"Cycle {cycle_name} créé pour {school.name}")
    print("Initialisation terminée !")

if __name__ == '__main__':
    run()
