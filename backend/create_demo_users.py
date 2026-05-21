import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import School

User = get_user_model()

def create_demo_users():
    school = School.objects.first()
    if not school:
        print("Erreur: Aucune école trouvée. Lancez d'abord setup_school.py")
        return

    users = [
        ('enseignant@seneschool.com', 'ENSEIGNANT', 'Moussa', 'Diop'),
        ('eleve@seneschool.com', 'ELEVE', 'Awa', 'Ndiaye'),
        ('parent@seneschool.com', 'PARENT', 'Modou', 'Sarr'),
    ]

    for email, role, first_name, last_name in users:
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'role': role,
                'first_name': first_name,
                'last_name': last_name,
                'school': school
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            print(f"Utilisateur créé: {email} (Rôle: {role})")
        else:
            print(f"Utilisateur existe déjà: {email}")

if __name__ == "__main__":
    create_demo_users()
