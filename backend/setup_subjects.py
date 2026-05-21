import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from academics.models import Subject

def setup_subjects():
    subjects = [
        ("Mathématiques", "MATHS"),
        ("Français", "FR"),
        ("Dictée", "DICTEE"),
        ("Texte Suivi de Questions", "TSQ"),
        ("Rédaction", "REDACTION"),
        ("Dissertation", "DISSERT"),
        ("Anglais", "ANG"),
        ("Histoire-Géographie", "H-G"),
        ("Éducation Civique", "EC"),
        ("Sciences de la Vie et de la Terre", "SVT"),
        ("Sciences Physiques", "PC"),
        ("Philosophie", "PHILO"),
        ("Arabe", "AR"),
        ("Espagnol", "ESP"),
        ("Portugais", "PORT"),
        ("Russe", "RUS"),
        ("Italien", "ITA"),
        ("Allemand", "ALL"),
        ("Éducation Physique et Sportive", "EPS"),
        ("Informatique", "INFO"),
        ("Économie Familiale", "EF"),
        ("Arts Plastiques", "ARTS"),
        ("Musique", "MUS")
    ]

    for name, code in subjects:
        Subject.objects.get_or_create(name=name, defaults={'code': code})

    print(f"{len(subjects)} matières initialisées avec succès !")

if __name__ == "__main__":
    setup_subjects()
