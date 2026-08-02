from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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

class IsAdminOnly(permissions.BasePermission):
    """ADMIN et DIRECTION ont les mêmes droits – lecture ouverte à tous les authentifiés."""
    ADMIN_ROLES = ['ADMIN', 'DIRECTION']

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in self.ADMIN_ROLES

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrDirection]

class SubjectAllocationViewSet(viewsets.ModelViewSet):
    queryset = SubjectAllocation.objects.none()
    serializer_class = SubjectAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SubjectAllocation.objects.none()
        if user.role == 'ENSEIGNANT':
            return SubjectAllocation.objects.filter(teacher=user).select_related('subject', 'classroom', 'teacher')
        if user.school:
            return SubjectAllocation.objects.filter(classroom__cycle__school=user.school).select_related('subject', 'classroom', 'teacher')
        return SubjectAllocation.objects.all().select_related('subject', 'classroom', 'teacher')

    def has_create_permission(self, request):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION']

    def create(self, request, *args, **kwargs):
        if not self.has_create_permission(request):
            from rest_framework.response import Response
            from rest_framework import status
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if not data.get('classroom') or not data.get('subject') or not data.get('teacher'):
            from rest_framework.response import Response
            from rest_framework import status
            return Response({'detail': 'Les champs matière, classe et enseignant sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save()

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
    """L'emploi du temps : lecture pour tous, écriture réservée à l'ADMIN uniquement."""
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsAdminOnly]

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
        queryset = TeachingPointage.objects.all()

        teacher_id = self.request.query_params.get('teacher')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)

        classroom_id = self.request.query_params.get('classroom')
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)

        month = self.request.query_params.get('month')
        if month and month != 'ALL':
            queryset = queryset.filter(date__month=month)

        year = self.request.query_params.get('year')
        if year and year != 'ALL':
            queryset = queryset.filter(date__year=year)

        status_value = self.request.query_params.get('status')
        if status_value:
            queryset = queryset.filter(status=status_value)

        if user.role == 'ENSEIGNANT':
            return queryset.filter(teacher=user).order_by('-date')
        if user.school:
            return queryset.filter(classroom__cycle__school=user.school).order_by('-date')
        return queryset.order_by('-date')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user, is_validated=False, status='PENDING')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        validated = queryset.filter(status='VALIDATED')
        pending = queryset.filter(status='PENDING')
        refused = queryset.filter(status='REFUSED')

        return Response({
            'total': queryset.count(),
            'validated': validated.count(),
            'pending': pending.count(),
            'refused': refused.count(),
            'total_hours': sum(item.hours_count or 0 for item in validated),
            'teachers': list(queryset.values_list('teacher__first_name', 'teacher__last_name').distinct())
        })

    def partial_update(self, request, *args, **kwargs):
        # Only ADMIN and DIRECTION can validate/refuse/remark pointages
        restricted_fields = ['is_validated', 'status', 'remark']
        if any(field in request.data for field in restricted_fields):
            if request.user.role not in ['ADMIN', 'DIRECTION']:
                return Response(
                    {'detail': 'Seul l’administration peut valider, refuser ou commenter le pointage.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Copy the data to avoid immutability issues
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Auto sync status and is_validated
        if 'status' in data:
            stat = data['status']
            if stat == 'VALIDATED':
                data['is_validated'] = True
            else:
                data['is_validated'] = False
        elif 'is_validated' in data:
            is_val = data['is_validated']
            data['status'] = 'VALIDATED' if is_val else 'PENDING'

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)


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
