from rest_framework import viewsets, permissions
from .models import Subject, SubjectAllocation, DiaryEntry
from .serializers import SubjectSerializer, SubjectAllocationSerializer, DiaryEntrySerializer

class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION', 'ENSEIGNANT']

class IsAdminOrDirection(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION']

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrDirection]

class SubjectAllocationViewSet(viewsets.ModelViewSet):
    queryset = SubjectAllocation.objects.none()  # Requis par le router DRF pour détecter le basename
    serializer_class = SubjectAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SubjectAllocation.objects.none()
        # Un enseignant voit seulement ses propres allocations
        if user.role == 'ENSEIGNANT':
            return SubjectAllocation.objects.filter(teacher=user)
        # Admin/Direction filtrent par école
        if user.school:
            return SubjectAllocation.objects.filter(classroom__cycle__school=user.school)
        return SubjectAllocation.objects.all()


    def has_create_permission(self, request):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION']

    def create(self, request, *args, **kwargs):
        if not self.has_create_permission(request):
            from rest_framework.response import Response
            from rest_framework import status
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

class DiaryEntryViewSet(viewsets.ModelViewSet):
    queryset = DiaryEntry.objects.all()
    serializer_class = DiaryEntrySerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ENSEIGNANT':
            return DiaryEntry.objects.filter(allocation__teacher=user)
        elif user.role in ['ELEVE', 'PARENT']:
            return DiaryEntry.objects.filter(status='PUBLISHED')
        return DiaryEntry.objects.all()

from .models import TimeSlot, TimetableEntry, TeachingPointage, Resource
from .serializers import TimeSlotSerializer, TimetableEntrySerializer, TeachingPointageSerializer, ResourceSerializer

class TimeSlotViewSet(viewsets.ModelViewSet):
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAdminOrDirection]

class TimetableEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsAdminOrDirection]

    def get_queryset(self):
        queryset = TimetableEntry.objects.all()
        classroom_id = self.request.query_params.get('classroom')
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        return queryset

class TeachingPointageViewSet(viewsets.ModelViewSet):
    serializer_class = TeachingPointageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ENSEIGNANT':
            return TeachingPointage.objects.filter(teacher=user).order_by('-date')
        if user.school:
            # Admin voit uniquement les pointages de son école
            return TeachingPointage.objects.filter(
                classroom__cycle__school=user.school
            ).order_by('-date')
        return TeachingPointage.objects.all().order_by('-date')

    def perform_create(self, serializer):
        is_val = False
        if self.request.user.role in ['ADMIN', 'DIRECTION']:
            is_val = self.request.data.get('is_validated', False)
        serializer.save(teacher=self.request.user, is_validated=is_val)

    def partial_update(self, request, *args, **kwargs):
        # Seuls les admin/direction peuvent valider
        if 'is_validated' in request.data:
            if request.user.role not in ['ADMIN', 'DIRECTION']:
                from rest_framework.response import Response
                from rest_framework import status
                return Response({'detail': 'Seul un directeur peut valider.'}, status=status.HTTP_403_FORBIDDEN)
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [IsTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ENSEIGNANT':
            return Resource.objects.filter(teacher=user)
        elif user.role in ['ELEVE', 'PARENT']:
            # Logique simplifiée : tout élève voit tout pour l'instant
            # À affiner selon la classe de l'élève
            return Resource.objects.all()
        return Resource.objects.all()

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)
