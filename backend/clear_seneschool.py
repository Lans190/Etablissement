import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import School, AcademicYear, Cycle, ClassRoom, SMSLog
from academics.models import Subject, SubjectAllocation, TimetableEntry, DiaryEntry, TimeSlot, TeachingPointage, Resource
from finance.models import FeeType, FeeAllocation, Payment, Expense
from students.models import Enrollment

User = get_user_model()

def clear_all_data():
    print("DEMARRAGE du nettoyage complet de SeneSchool...")
    
    # 1. Finance
    print("Suppression des paiements, allocations, types de frais et depenses...")
    Payment.objects.all().delete()
    FeeAllocation.objects.all().delete()
    FeeType.objects.all().delete()
    Expense.objects.all().delete()
    
    # 2. Academics
    print("Suppression du cahier de texte, pointages, ressources et emplois du temps...")
    Resource.objects.all().delete()
    TeachingPointage.objects.all().delete()
    DiaryEntry.objects.all().delete()
    TimetableEntry.objects.all().delete()
    SubjectAllocation.objects.all().delete()
    Subject.objects.all().delete()
    
    # 3. Inscriptions et SMS
    print("Suppression des inscriptions et historiques SMS...")
    Enrollment.objects.all().delete()
    SMSLog.objects.all().delete()
    
    # 4. Utilisateurs (garder ADMIN et DIRECTION)
    print("Suppression des comptes eleves, parents, enseignants fictifs...")
    deleted_users, _ = User.objects.exclude(role__in=['ADMIN', 'DIRECTION']).delete()
    print(f"Comptes non-admin supprimes : {deleted_users}")
    
    # 5. Nettoyer les classes et cycles pour un depart 100% propre
    print("Suppression des classes et cycles existants...")
    ClassRoom.objects.all().delete()
    Cycle.objects.all().delete()
    
    print("NETTOYAGE REUSSI !")
    
    # 6. Re-initialisation avec des classes vierges de base
    print("Re-initialisation des cycles et classes standard...")
    from setup_school import setup_standard_classes
    setup_standard_classes()

if __name__ == "__main__":
    clear_all_data()
