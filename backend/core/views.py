from rest_framework import viewsets, permissions
from .models import School, Cycle, AcademicYear, ClassRoom, SchoolEvent
from .serializers import SchoolSerializer, CycleSerializer, AcademicYearSerializer, ClassRoomSerializer, SchoolEventSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Seuls les administrateurs et la direction peuvent modifier. Les autres peuvent seulement lire.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'DIRECTION']

class SchoolViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return School.objects.none()
        if user.school:
            return School.objects.filter(id=user.school.id)
        if user.is_staff or user.role in ['ADMIN', 'DIRECTION']:
            return School.objects.all()
        return School.objects.none()

class CycleViewSet(viewsets.ModelViewSet):
    serializer_class = CycleSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Cycle.objects.none()
        if user.school:
            return Cycle.objects.filter(school=user.school)
        return Cycle.objects.all()

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdminOrReadOnly]

class ClassRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ClassRoom.objects.none()
        if user.school:
            return ClassRoom.objects.filter(cycle__school=user.school)
        return ClassRoom.objects.all()

class SchoolEventViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolEventSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SchoolEvent.objects.none()
        if user.school:
            return SchoolEvent.objects.filter(school=user.school)
        return SchoolEvent.objects.all()

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)


from .models import SMSLog
from .serializers import SMSLogSerializer
from .sms_service import SMSService
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class SMSLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SMSLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return SMSLog.objects.filter(school=user.school).order_by('-sent_at')
        return SMSLog.objects.none()

class SendBulkSMSView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['ADMIN', 'DIRECTION']:
            return Response({"error": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
            
        school = request.user.school
        if not school:
            return Response({"error": "Utilisateur non associé à une école"}, status=status.HTTP_400_BAD_REQUEST)
            
        recipients = request.data.get('recipients', [])
        message = request.data.get('message')
        
        if not recipients or not message:
            return Response({"error": "Données incomplètes"}, status=status.HTTP_400_BAD_REQUEST)
            
        results = SMSService.send_bulk_sms(school, recipients, message)
        return Response({"status": "success", "sent_count": len(results)})

from django.db.models import Sum, Count, Avg, Q
from students.models import Enrollment
from finance.models import Payment
from academics.models import SubjectAllocation

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        school = user.school
        
        if not school:
            return Response({"error": "No school found"}, status=400)

        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from datetime import date as dt_date
        User = get_user_model()
        from finance.models import Payment, Expense
        from academics.models import TeachingPointage
        from students.models import Attendance

        today = dt_date.today()

        # 1. Chiffres Globaux
        total_students = Enrollment.objects.filter(classroom__cycle__school=school, is_active=True).count()
        total_teachers = User.objects.filter(school=school, role='ENSEIGNANT').count()
        total_classes = ClassRoom.objects.filter(cycle__school=school).count()
        
        # 2. Établissement par Cycle (Élèves et Enseignants)
        cycles_stats = []
        cycles = Cycle.objects.filter(school=school)
        for cycle in cycles:
            student_count = Enrollment.objects.filter(classroom__cycle=cycle, is_active=True).count()
            teacher_count = User.objects.filter(
                role='ENSEIGNANT',
                allocations__classroom__cycle=cycle
            ).distinct().count()
            
            cycles_stats.append({
                "name": cycle.get_name_display(),
                "students": student_count,
                "teachers": teacher_count
            })

        # 3. Élèves par Classe
        classes_stats = ClassRoom.objects.filter(cycle__school=school).annotate(
            student_count=Count('enrollments', filter=Q(enrollments__is_active=True))
        ).values('name', 'student_count')

        # 4. Finance (Bilan global)
        total_revenue = Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=school
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        total_expenses = Expense.objects.filter(school=school).aggregate(total=Sum('amount'))['total'] or 0
        
        # Paiements en attente (allocations non payées)
        unpaid_fees_count = 0
        try:
            from finance.models import FeeAllocation
            unpaid_fees_count = FeeAllocation.objects.filter(
                enrollment__classroom__cycle__school=school,
                is_paid=False
            ).count()
        except Exception:
            pass

        # Activité récente
        recent_payments = Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=school
        ).order_by('-payment_date')[:5]
        
        from finance.serializers import PaymentSerializer
        recent_payments_data = PaymentSerializer(recent_payments, many=True).data

        # 5. Absences du jour
        today_absences = Attendance.objects.filter(
            enrollment__classroom__cycle__school=school,
            date=today,
            status='ABSENT'
        ).count()
        pending_absences = Attendance.objects.filter(
            enrollment__classroom__cycle__school=school,
            status='ABSENT',
            is_validated=False
        ).count()

        # 6. Pointages en attente de validation
        pending_pointages = TeachingPointage.objects.filter(
            classroom__cycle__school=school,
            status='PENDING'
        ).count()

        # 7. Données de pointages pour graphique (7 derniers jours)
        from datetime import timedelta
        pointage_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            validated = TeachingPointage.objects.filter(
                classroom__cycle__school=school,
                date=day,
                status='VALIDATED'
            ).count()
            pointage_trend.append({
                "date": day.strftime('%d/%m'),
                "validated": validated
            })

        return Response({
            "stats": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_classes": total_classes,
                "balance": float(total_revenue - total_expenses),
                "revenue": float(total_revenue),
                "expenses": float(total_expenses),
                "today_absences": today_absences,
                "pending_absences": pending_absences,
                "pending_pointages": pending_pointages,
                "unpaid_fees": unpaid_fees_count,
            },
            "cycles": cycles_stats,
            "classes": list(classes_stats),
            "recent_payments": recent_payments_data,
            "pointage_trend": pointage_trend,
        })


class GrokAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import os
        import json
        import requests
        
        user = request.user
        school = user.school
        if not school:
            return Response({"error": "No school found"}, status=400)

        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from datetime import date as dt_date
        User = get_user_model()
        from finance.models import Payment, Expense, FeeAllocation
        from students.models import Attendance

        today = dt_date.today()

        # Gather data
        total_students = Enrollment.objects.filter(classroom__cycle__school=school, is_active=True).count()
        total_teachers = User.objects.filter(school=school, role='ENSEIGNANT').count()
        total_classes = ClassRoom.objects.filter(cycle__school=school).count()
        
        total_revenue = Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=school
        ).aggregate(total=Sum('amount_paid'))['total'] or 0
        total_expenses = Expense.objects.filter(school=school).aggregate(total=Sum('amount'))['total'] or 0
        balance = total_revenue - total_expenses
        
        unpaid_fees_count = FeeAllocation.objects.filter(
            enrollment__classroom__cycle__school=school,
            is_paid=False
        ).count()

        total_absences = Attendance.objects.filter(
            enrollment__classroom__cycle__school=school,
            date=today,
            status='ABSENT'
        ).count()

        total_recorded_absences = Attendance.objects.filter(
            enrollment__classroom__cycle__school=school,
            status='ABSENT'
        ).count()

        # Build context
        data_summary = {
            "nom_ecole": school.name,
            "adresse": school.address or "Non spécifiée",
            "effectif_eleves": total_students,
            "nombre_enseignants": total_teachers,
            "nombre_classes": total_classes,
            "finance": {
                "recettes_totales_fcfa": float(total_revenue),
                "depenses_totales_fcfa": float(total_expenses),
                "solde_fcfa": float(balance),
                "allocations_frais_impayes": unpaid_fees_count
            },
            "assiduite": {
                "nombre_absences_aujourd_hui": total_absences,
                "nombre_total_absences_enregistrees": total_recorded_absences
            }
        }

        # Check API Key
        api_key = os.environ.get('GROK_API_KEY') or os.environ.get('XAI_API_KEY')
        prompt = f"""
        En tant qu'assistant IA spécialisé dans l'analyse de gestion d'établissements scolaires (SeneSchool AI), analyse les données suivantes pour l'école "{school.name}" et génère un rapport d'analyse stratégique concis contenant :
        1. Diagnostic général (Forces et faiblesses basées sur les chiffres)
        2. Analyse financière (Santé de la trésorerie et recouvrement des frais)
        3. Analyse de l'assiduité (Diagnostic sur l'absentéisme des élèves)
        4. Recommandations concrètes (Actions prioritaires à mener).
        
        Données :
        {json.dumps(data_summary, indent=2)}
        
        Réponds en français avec un ton professionnel, encourageant et structuré en Markdown.
        """

        if api_key:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "grok-beta",
                    "messages": [
                        {"role": "system", "content": "Tu es un expert en audit scolaire et conseiller de direction pour SeneSchool."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7
                }
                api_res = requests.post("https://api.x.ai/v1/chat/completions", headers=headers, json=payload, timeout=15)
                if api_res.status_code == 200:
                    ai_content = api_res.json()['choices'][0]['message']['content']
                    return Response({"analysis": ai_content, "provider": "Grok AI"})
            except Exception as e:
                pass

        # Mock Analysis Fallback if no key or API failed
        mock_analysis = f"""### 📊 Analyse Stratégique pour {school.name}

*Généré par SeneSchool AI (Simulateur d'Audit)*

#### 1. Diagnostic Général
- **Forces** : L'établissement compte un effectif de **{total_students} élèves** encadrés par **{total_teachers} enseignants** répartis sur **{total_classes} classes**. Le ratio élèves/enseignant est optimal pour un suivi pédagogique de qualité.
- **Points de vigilance** : Assurer une bonne répartition des charges de cours et suivre les pointages réguliers des enseignants pour maximiser le temps d'apprentissage.

#### 2. Analyse Financière
- **Trésorerie** : Les recettes totales s'élèvent à **{total_revenue:,.0f} FCFA** contre des dépenses de **{total_expenses:,.0f} FCFA**, ce qui dégage un solde de **{balance:,.0f} FCFA**.
- **Recouvrement** : Il y a actuellement **{unpaid_fees_count} mensualités ou frais en attente de paiement**. Cela représente un risque pour la trésorerie.
- *Recommandation* : Mettre en place un plan de relance automatique par SMS via notre module de communication pour les parents ayant des arriérés.

#### 3. Analyse de l'Assiduité
- **Absentéisme** : Un total de **{total_absences} absences** a été enregistré aujourd'hui, avec un historique cumulé de **{total_recorded_absences} absences**.
- *Recommandation* : Automatiser la validation administrative des absences quotidiennes pour maintenir une rigueur et envoyer des alertes immédiates aux tuteurs.

#### 4. Recommandations Prioritaires
1. **Campagne de Recouvrement** : Relancer les parents pour les **{unpaid_fees_count} frais impayés** avant la fin de la période d'examens.
2. **Suivi des pointages** : Valider les heures de cours en attente pour garantir le paiement juste des heures supplémentaires des enseignants.
3. **Conseil pédagogique** : Organiser une réunion de coordination pour consolider le taux d'assiduité au-delà de 95%.
"""
        return Response({"analysis": mock_analysis, "provider": "SeneSchool Mock Engine"})


