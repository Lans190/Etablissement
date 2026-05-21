import os
import django
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import School, AcademicYear, Cycle, ClassRoom
from academics.models import Subject, SubjectAllocation, TimetableEntry, DiaryEntry, TimeSlot
from finance.models import FeeType, FeeAllocation, Payment, Expense
from students.models import Enrollment

User = get_user_model()

def populate():
    print("DEMARRAGE de la population des donnees SeneSchool...")

    # 1. Établissement
    school, _ = School.objects.get_or_create(
        name="Groupe Scolaire SeneSchool Dakar",
        defaults={
            'address': "Sacré-Cœur 3, Dakar, Sénégal",
            'phone_number': "+221 33 800 00 00",
            'email': "contact@seneschool-dakar.sn"
        }
    )

    # 2. Année Académique
    academic_year, _ = AcademicYear.objects.get_or_create(
        name="2025-2026",
        defaults={
            'start_date': date(2025, 10, 1),
            'end_date': date(2026, 7, 31),
            'is_active': True
        }
    )

    # 3. Cycles et Classes
    cycles_data = {
        'PRIMAIRE': ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
        'COLLEGE': ['6ème', '5ème', '4ème', '3ème'],
        'LYCEE': ['2nde L', '2nde S', '1ère L', '1ère S', 'Terminale L', 'Terminale S']
    }

    classrooms = []
    for cycle_name, class_list in cycles_data.items():
        cycle_obj, _ = Cycle.objects.get_or_create(name=cycle_name, school=school)
        for c_name in class_list:
            cls, _ = ClassRoom.objects.get_or_create(name=c_name, cycle=cycle_obj)
            classrooms.append(cls)

    # 4. Matières
    subjects_data = [
        ('Mathématiques', 5), ('Français', 6), ('Anglais', 3), ('Histoire-Géo', 3),
        ('SVT', 4), ('Physique-Chimie', 4), ('Philosophie', 4), ('Arabe', 2), ('EPS', 2)
    ]
    subjects = []
    for s_name, coef in subjects_data:
        sub, _ = Subject.objects.get_or_create(name=s_name)
        subjects.append((sub, coef))

    # 5. Utilisateurs (Enseignants, Parents, Élèves)
    # Enseignants
    teachers = []
    first_names = ['Moussa', 'Abdoulaye', 'Fatou', 'Aminata', 'Ousmane', 'Mariama', 'Ibrahima']
    last_names = ['Diop', 'Ndiaye', 'Sarr', 'Fall', 'Sow', 'Gueye', 'Diallo']

    for i in range(5):
        email = f"prof.{last_names[i].lower()}@seneschool.sn"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_names[i],
                'last_name': last_names[i],
                'role': 'ENSEIGNANT',
                'school': school,
                'matricule': f"PROF-2025-{i+1:03d}"
            }
        )
        if created:
            user.set_password('password123')
            user.save()
        teachers.append(user)

    # 6. Allocations
    allocs = []
    for cls in classrooms[:5]:
        for sub_tuple in subjects[:3]:
            sub, coef = sub_tuple
            prof = random.choice(teachers)
            alloc, _ = SubjectAllocation.objects.get_or_create(
                classroom=cls,
                subject=sub,
                defaults={'teacher': prof, 'coefficient': coef}
            )
            allocs.append(alloc)
            
            # Créer une entrée dans le cahier de texte
            DiaryEntry.objects.get_or_create(
                allocation=alloc,
                date=date.today(),
                defaults={
                    'title': f"Introduction à {sub.name}",
                    'content': f"Aujourd'hui nous avons abordé les bases de {sub.name}.",
                    'status': 'PUBLISHED'
                }
            )

    # 7. Créneaux horaires
    slots = [('08:00', '10:00'), ('10:00', '12:00'), ('15:00', '17:00')]
    timeslot_objs = []
    for start, end in slots:
        ts, _ = TimeSlot.objects.get_or_create(start_time=start, end_time=end)
        timeslot_objs.append(ts)

    # 8. Emploi du temps
    days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI']
    for alloc in allocs[:15]:
        day = random.choice(days)
        slot = random.choice(timeslot_objs)
        TimetableEntry.objects.get_or_create(
            classroom=alloc.classroom,
            day=day,
            timeslot=slot,
            defaults={'allocation': alloc}
        )

    # 9. Finance (Fees Definition first)
    scolarite_primaire, _ = FeeType.objects.get_or_create(
        school=school, name="Scolarité Primaire", defaults={'default_amount': 25000, 'is_monthly': True}
    )
    scolarite_lycee, _ = FeeType.objects.get_or_create(
        school=school, name="Scolarité Lycée", defaults={'default_amount': 45000, 'is_monthly': True}
    )

    # 10. Élèves et Inscriptions + Paiements
    for i in range(10):
        email = f"student{i}@seneschool.sn"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': f"Élève{i}",
                'last_name': random.choice(last_names),
                'role': 'ELEVE',
                'school': school,
                'matricule': f"SN-2025-{i+1:04d}"
            }
        )
        if created:
            user.set_password('password123')
            user.save()
        
        cls = random.choice(classrooms)
        enroll, _ = Enrollment.objects.get_or_create(
            student=user,
            academic_year=academic_year,
            defaults={'classroom': cls}
        )

        if i < 5:
            fee_type = scolarite_primaire if cls.cycle.name == 'PRIMAIRE' else scolarite_lycee
            alloc, _ = FeeAllocation.objects.get_or_create(
                enrollment=enroll,
                fee_type=fee_type,
                defaults={'amount': fee_type.default_amount, 'due_date': date(2026, 5, 30)}
            )
            Payment.objects.get_or_create(
                fee_allocation=alloc,
                amount_paid=alloc.amount,
                defaults={'payment_method': 'CASH', 'recorded_by': teachers[0]}
            )
            alloc.is_paid = True
            alloc.save()

    # 11. Dépenses
    Expense.objects.get_or_create(
        school=school, title="Achat fournitures bureau", defaults={'amount': 15000, 'category': 'MATERIEL'}
    )
    Expense.objects.get_or_create(
        school=school, title="Facture électricité Senelec", defaults={'amount': 45000, 'category': 'CHARGES'}
    )

    print("SUCCESS: Population terminee !")

if __name__ == "__main__":
    populate()
