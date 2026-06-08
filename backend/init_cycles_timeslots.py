import os
import django
from datetime import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from core.models import School, Cycle
from academics.models import TimeSlot

def run():
    school = School.objects.first()
    if not school:
        school = School.objects.create(name="SeneSchool Pilote")

    # 1. Créer les Cycles s'ils n'existent pas
    for cycle_name in ['PRIMAIRE', 'COLLEGE', 'LYCEE']:
        Cycle.objects.get_or_create(school=school, name=cycle_name)

    # 2. Créer des créneaux horaires par défaut (ex: matin, après-midi)
    default_slots = [
        (time(8, 0), time(9, 0)),
        (time(9, 0), time(10, 0)),
        (time(10, 0), time(11, 0)),
        (time(11, 0), time(12, 0)),
        (time(15, 0), time(16, 0)),
        (time(16, 0), time(17, 0)),
        (time(17, 0), time(18, 0)),
    ]
    
    for start, end in default_slots:
        TimeSlot.objects.get_or_create(start_time=start, end_time=end)

    print("Cycles (Primaire, College, Lycee) et Creneaux horaires generes avec succes !")

if __name__ == '__main__':
    run()
