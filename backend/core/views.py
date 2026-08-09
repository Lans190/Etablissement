from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from datetime import date as dt_date, datetime
from .models import School, Cycle, AcademicYear, ClassRoom
from .serializers import SchoolSerializer, CycleSerializer, AcademicYearSerializer, ClassRoomSerializer


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

from .models import SchoolEvent
from .serializers import SchoolEventSerializer

class SchoolEventViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolEventSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SchoolEvent.objects.none()
        qs = SchoolEvent.objects.all()
        if user.school:
            qs = qs.filter(school=user.school)
        # Filtre optionnel par mois/année
        month = self.request.query_params.get('month')
        year  = self.request.query_params.get('year')
        if year:
            qs = qs.filter(start_date__year=year)
        if month:
            qs = qs.filter(start_date__month=month)
        return qs.order_by('start_date')

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school, created_by=self.request.user)



from django.db.models import Sum, Count, Avg, Q
from students.models import Enrollment
from finance.models import Payment
from academics.models import SubjectAllocation

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        school = user.school or School.objects.first()
        
        if not school:
            return Response({"error": "Aucun établissement configuré"}, status=400)

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


from .models import Notification
from .serializers import NotificationSerializer

def create_notification(school, title, message, type='INFO', user=None):
    """Fonction utilitaire globale pour générer des notifications dans le système"""
    if not school:
        school = School.objects.first()
    if school:
        Notification.objects.create(
            school=school,
            title=title,
            message=message,
            type=type,
            user=user
        )

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        school = user.school or School.objects.first()
        if not school:
            return Notification.objects.none()
        
        # Filtre par école et par utilisateur si spécifié ou global
        qs = Notification.objects.filter(school=school)
        if user.role not in ['ADMIN', 'DIRECTION']:
            qs = qs.filter(Q(user=user) | Q(user__isnull=True))
        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        qs = self.get_queryset().filter(is_read=False)
        qs.update(is_read=True)
        return Response({"status": "success", "marked_count": qs.count()})


import json
import urllib.request
import os

class GrokAIAssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in ['ADMIN', 'DIRECTION']:
            return Response(
                {"detail": "Accès refusé. L'utilisation de l'Assistant IA est réservée exclusivement à l'administration de l'établissement."},
                status=status.HTTP_403_FORBIDDEN
            )

        school = user.school or School.objects.first()
        prompt = request.data.get('prompt', '').strip()

        if not prompt:
            return Response({"error": "Veuillez poser une question à l'assistant IA."}, status=400)

        # 1. Extraction en direct des métriques de PostgreSQL
        from django.contrib.auth import get_user_model
        from students.models import Enrollment, Attendance
        from finance.models import Payment, Expense, FeeAllocation, Payslip
        from academics.models import TeachingPointage, SubjectAllocation

        User = get_user_model()
        today = dt_date.today()

        total_students = Enrollment.objects.filter(classroom__cycle__school=school, is_active=True).count()
        total_teachers = User.objects.filter(school=school, role='ENSEIGNANT').count()
        total_classes = ClassRoom.objects.filter(cycle__school=school).count()

        total_recettes = Payment.objects.filter(
            fee_allocation__enrollment__classroom__cycle__school=school
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        total_depenses = Expense.objects.filter(school=school).aggregate(total=Sum('amount'))['total'] or 0
        net_balance = total_recettes - total_depenses

        unpaid_count = FeeAllocation.objects.filter(
            enrollment__classroom__cycle__school=school,
            is_paid=False
        ).count()

        unpaid_sum = FeeAllocation.objects.filter(
            enrollment__classroom__cycle__school=school,
            is_paid=False
        ).aggregate(total=Sum('amount'))['total'] or 0

        today_absences = Attendance.objects.filter(
            enrollment__classroom__cycle__school=school,
            date=today,
            status='ABSENT'
        ).count()

        top_teachers = TeachingPointage.objects.filter(
            classroom__cycle__school=school,
            status='VALIDATED'
        ).values('teacher__first_name', 'teacher__last_name').annotate(total_h=Sum('hours_count')).order_by('-total_h')[:5]

        teacher_hours_summary = [f"{t['teacher__first_name']} {t['teacher__last_name']}: {t['total_h']}h" for t in top_teachers]

        context_data = {
            "nom_etablissement": school.name if school else "Établissement",
            "effectif_eleves": total_students,
            "effectif_enseignants": total_teachers,
            "total_classes": total_classes,
            "recettes_totales_fcfa": float(total_recettes),
            "depenses_totales_fcfa": float(total_depenses),
            "benefice_net_fcfa": float(net_balance),
            "frais_impayes_nombre": unpaid_count,
            "montant_impayes_estime_fcfa": float(unpaid_sum),
            "absences_aujourdhui": today_absences,
            "top_enseignants_heures": teacher_hours_summary,
            "date_du_jour": str(today)
        }

        system_instruction = (
            f"Vous êtes l'Assistant IA officiel d'analyse de données pour l'établissement scolaire {context_data['nom_etablissement']}.\n"
            "Vous répondez exclusivement sur la base des données réelles ci-dessous extraites directement de PostgreSQL.\n"
            "Soyez précis, professionnel, avec un ton structuré et constructif (utilisez le symbole FCFA, des puces de texte, des tableaux en Markdown si pertinent).\n"
            "Ne réinventez pas les chiffres. Si une donnée n'est pas disponible, indiquez-le clairement.\n\n"
            f"DONNÉES EN TEMPS RÉEL DE L'ÉTABLISSEMENT:\n{json.dumps(context_data, ensure_ascii=False, indent=2)}\n"
        )

        from django.conf import settings
        grok_api_key = (
            os.getenv("GROK_API_KEY")
            or os.getenv("XAI_API_KEY")
            or getattr(settings, 'GROK_API_KEY', '')
        )

        if grok_api_key and grok_api_key.strip():
            clean_key = grok_api_key.strip()
            models_to_try = ["grok-2-latest", "grok-beta", "grok-2"]
            
            for model_name in models_to_try:
                try:
                    payload = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3
                    }
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {clean_key}"
                    }
                    req = urllib.request.Request(
                        "https://api.x.ai/v1/chat/completions",
                        data=json.dumps(payload).encode('utf-8'),
                        headers=headers,
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        resp_data = json.loads(resp.read().decode('utf-8'))
                        ai_reply = resp_data['choices'][0]['message']['content']
                        return Response({
                            "answer": ai_reply,
                            "context": context_data,
                            "source": f"API Grok xAI ({model_name})"
                        })
                except Exception:
                    continue

        # Fallback intelligent basé sur les règles métier si la clé API n'est pas encore saisie
        prompt_lower = prompt.lower()
        if "recette" in prompt_lower or "revenu" in prompt_lower or "finan" in prompt_lower or "bénéfice" in prompt_lower or "depense" in prompt_lower or "bilan" in prompt_lower:
            reply = (
                f"### 📊 Rapport Financier - {context_data['nom_etablissement']}\n\n"
                f"- **Recettes Totales Encaissees :** `{context_data['recettes_totales_fcfa']:,.0f} FCFA`\n"
                f"- **Dépenses Totales :** `{context_data['depenses_totales_fcfa']:,.0f} FCFA`\n"
                f"- **Résultat Net / Bénéfice :** `{context_data['benefice_net_fcfa']:,.0f} FCFA`\n"
                f"- **Montant Reste à Encaisser (Impayés) :** `{context_data['montant_impayes_estime_fcfa']:,.0f} FCFA` ({context_data['frais_impayes_nombre']} échéances)\n\n"
                "💡 **Recommandation :** Relancer en priorité les parents ayant des échéances impayées pour optimiser la trésorerie mensuelle."
            )
        elif "enseignant" in prompt_lower or "prof" in prompt_lower or "heure" in prompt_lower or "salaire" in prompt_lower:
            teachers_str = "\n".join([f"- {t}" for t in teacher_hours_summary]) if teacher_hours_summary else "- Aucun pointage validé enregistré."
            reply = (
                f"### 👨‍🏫 Analyse Ressources Humaines & Enseignants\n\n"
                f"- **Nombre total d'enseignants :** `{total_teachers}`\n"
                f"- **Volume d'heures validées par enseignant :**\n{teachers_str}\n\n"
                "💡 **Calcul Automatique :** Le salaire des enseignants est calculé sur la formule `Taux Horaire × Heures Validées + Salaire de Base + Primes - Retenues`."
            )
        elif "élève" in prompt_lower or "eleve" in prompt_lower or "inscrit" in prompt_lower or "classe" in prompt_lower:
            reply = (
                f"### 🎓 Synthèse des Effectifs Scolaires\n\n"
                f"- **Total Élèves Inscrits :** `{total_students}`\n"
                f"- **Nombre de Classes Ouvertes :** `{total_classes}`\n"
                f"- **Absences Aujourd'hui ({today}) :** `{today_absences} élève(s)`\n"
            )
        else:
            reply = (
                f"### 🤖 Synthèse Générale - {context_data['nom_etablissement']}\n\n"
                f"- **Élèves inscrits :** `{total_students}` | **Classes :** `{total_classes}`\n"
                f"- **Enseignants :** `{total_teachers}`\n"
                f"- **Recettes encaissees :** `{total_recettes:,.0f} FCFA` | **Dépenses :** `{total_depenses:,.0f} FCFA`\n"
                f"- **Balance Financière :** `{net_balance:,.0f} FCFA`\n"
                f"- **Échéances impayées :** `{unpaid_count}` (`{unpaid_sum:,.0f} FCFA`)\n\n"
                "Tapez une question spécifique pour obtenir un rapport approfondi sur les finances, les présences ou les fiches de paie."
            )

        return Response({"answer": reply, "context": context_data, "source": "Base de Données PostgreSQL"})


