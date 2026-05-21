from rest_framework import viewsets, permissions
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

# =========================================================
# AUTHENTIFICATION PERSONNALISÉE (Username OU Email)
# =========================================================
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

class EmailOrUsernameTokenSerializer(TokenObtainPairSerializer):
    """
    Permet de se connecter avec le nom d'utilisateur OU l'email.
    Indispensable pour les comptes Élèves et Parents dont
    le username a été généré automatiquement sous forme d'email.
    """
    def validate(self, attrs):
        login_input = attrs.get('username', '')
        password = attrs.get('password', '')

        user = None

        # Tentative 1 : connexion par username exact
        try:
            candidate = User.objects.get(username=login_input)
            if candidate.check_password(password) and candidate.is_active:
                user = candidate
        except User.DoesNotExist:
            pass

        # Tentative 2 : connexion par email (si username non trouvé)
        if user is None:
            try:
                candidate = User.objects.get(email=login_input)
                if candidate.check_password(password) and candidate.is_active:
                    user = candidate
            except User.DoesNotExist:
                pass

        if user is None:
            raise AuthenticationFailed(
                "Identifiants incorrects. Vérifiez votre nom d'utilisateur/email et votre mot de passe.",
                code='authentication_failed'
            )

        # Substituer le username pour que simplejwt fonctionne normalement
        attrs['username'] = user.username
        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenSerializer


# =========================================================

class IsSchoolAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION']

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' and not user.school:
            # Super admin de la plateforme : voit tout le monde
            return User.objects.all()
        elif user.school:
            # Directeur ou Admin d'une école spécifique : ne voit que les membres de son école
            return User.objects.filter(school=user.school)
        return User.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        school_id = user.school_id
        
        matricule = self.request.data.get('matricule')
        if not matricule and school_id:
            from core.models import AcademicYear
            count = User.objects.filter(school_id=school_id).count() + 1
            year_obj = AcademicYear.objects.filter(is_active=True).first()
            year = year_obj.name.split('-')[0] if year_obj else "2026"
            # On inclut le school_id pour garantir l'unicité globale entre établissements
            matricule = f"SN-{school_id}-{year}-{count:04d}"
            
        if school_id:
            serializer.save(school_id=school_id, matricule=matricule)
        else:
            serializer.save(matricule=matricule)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from core.models import School

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class RegisterSchoolView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data
        try:
            # 1. Créer l'école
            school = School.objects.create(
                name=data.get('school_name'),
                address=data.get('school_address', ''),
                phone_number=data.get('school_phone', '')
            )
            
            # 2. Créer l'utilisateur Administrateur / Directeur
            user = User.objects.create_user(
                username=data.get('admin_username'),
                password=data.get('admin_password'),
                first_name=data.get('admin_first_name', ''),
                last_name=data.get('admin_last_name', ''),
                email=data.get('admin_email', ''),
                role='DIRECTION',
                school=school
            )
            
            return Response({"message": "École et compte administrateur créés avec succès."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

