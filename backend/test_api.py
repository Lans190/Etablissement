import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seneschool_backend.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
User = get_user_model()

user = User.objects.filter(role='ADMIN').first()
client = APIClient()
client.force_authenticate(user=user)
res = client.get('/api/academics/timeslots/')
print(res.status_code)
print(res.json())
