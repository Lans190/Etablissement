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

        # 1. Extraction approfondie en direct des métriques de PostgreSQL (calculs 100% exécutés par Django)
        from django.contrib.auth import get_user_model
        from students.models import Enrollment, Attendance
        from finance.models import Payment, Expense, FeeAllocation, Payslip
        from academics.models import TeachingPointage, SubjectAllocation, ClassRoom
        from django.db.models import Sum, Count, Q
        from datetime import timedelta, date as dt_date

        User = get_user_model()
        today = dt_date.today()
        first_day_this_month = today.replace(day=1)
        last_month_end = first_day_this_month - timedelta(days=1)
        first_day_last_month = last_month_end.replace(day=1)
        start_of_week = today - timedelta(days=today.weekday())

        try:
            # A. Effectifs & Classes
            total_students = Enrollment.objects.filter(classroom__cycle__school=school, is_active=True).count() if school else Enrollment.objects.filter(is_active=True).count()
            total_teachers = User.objects.filter(school=school, role='ENSEIGNANT').count() if school else User.objects.filter(role='ENSEIGNANT').count()
            total_classes = ClassRoom.objects.filter(cycle__school=school).count() if school else ClassRoom.objects.count()

            top_class_qs = ClassRoom.objects.filter(cycle__school=school) if school else ClassRoom.objects.all()
            top_class = top_class_qs.annotate(
                c_count=Count('enrollments', filter=Q(enrollments__is_active=True))
            ).order_by('-c_count').first()
            top_class_name = f"{top_class.name} ({top_class.c_count} élèves)" if top_class else "Non définie"

            # B. Finances - Recettes, Dépenses, Mois Actuel vs Dernier
            recettes_totales = Payment.objects.aggregate(total=Sum('amount_paid'))['total'] or 0
            recettes_mois_actuel = Payment.objects.filter(payment_date__gte=first_day_this_month).aggregate(total=Sum('amount_paid'))['total'] or 0
            recettes_mois_dernier = Payment.objects.filter(payment_date__gte=first_day_last_month, payment_date__lte=last_month_end).aggregate(total=Sum('amount_paid'))['total'] or 0

            depenses_totales = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
            depenses_mois_actuel = Expense.objects.filter(date__gte=first_day_this_month).aggregate(total=Sum('amount'))['total'] or 0
            net_balance = recettes_totales - depenses_totales

            # Poste de dépense le plus cher
            top_expense_cat = Expense.objects.values('category').annotate(cat_sum=Sum('amount')).order_by('-cat_sum').first()
            top_expense_cat_name = f"{top_expense_cat['category']} ({float(top_expense_cat['cat_sum']):,.0f} FCFA)" if top_expense_cat else "Aucune dépense"

            # Impayés et Acomptes
            unpaid_allocations = FeeAllocation.objects.filter(is_paid=False)
            unpaid_count = unpaid_allocations.count()
            unpaid_sum = unpaid_allocations.aggregate(total=Sum('amount'))['total'] or 0

            # Liste des élèves en impayé
            unpaid_students_qs = unpaid_allocations.select_related('enrollment__student', 'enrollment__classroom')[:10]
            unpaid_students_list = [
                f"{a.enrollment.student.get_full_name()} ({a.enrollment.classroom.name}) : reste {float(a.amount - a.amount_paid):,.0f} FCFA"
                for a in unpaid_students_qs if a.enrollment and a.enrollment.student and a.enrollment.classroom
            ]

            # Acomptes
            acomptes_qs = FeeAllocation.objects.filter(amount_paid__gt=0, is_paid=False)
            acomptes_count = acomptes_qs.count()
            acomptes_list = [
                f"{a.enrollment.student.get_full_name()} ({a.enrollment.classroom.name}) : payé {float(a.amount_paid):,.0f} / {float(a.amount):,.0f} FCFA"
                for a in acomptes_qs.select_related('enrollment__student', 'enrollment__classroom')[:10] if a.enrollment and a.enrollment.student and a.enrollment.classroom
            ]

            # C. Enseignants & Salaires
            teachers_qs = User.objects.filter(role='ENSEIGNANT')
            if school:
                teachers_qs = teachers_qs.filter(school=school)
            teachers_payroll_summary = []
            for t in teachers_qs:
                h_count = TeachingPointage.objects.filter(
                    teacher=t
                ).filter(Q(status='VALIDATED') | Q(is_validated=True)).aggregate(total=Sum('hours_count'))['total'] or 0
                h_rate = float(t.hourly_rate or 0)
                base_sal = float(t.base_salary or 0)
                allowances = float(t.allowances or 0)
                deductions = float(t.deductions or 0)
                calculated_salary = (float(h_count) * h_rate) + base_sal + allowances - deductions
                teachers_payroll_summary.append({
                    "nom": t.get_full_name(),
                    "heures": float(h_count),
                    "taux": h_rate,
                    "base": base_sal,
                    "primes": allowances,
                    "cotisations": deductions,
                    "salaire_net": calculated_salary
                })

            # D. Présences & Absences
            today_absences = Attendance.objects.filter(date=today, status='ABSENT').count()

            # Taux de présence cette semaine
            week_attendances = Attendance.objects.filter(date__gte=start_of_week)
            total_week_records = week_attendances.count()
            present_week_records = week_attendances.filter(status='PRESENT').count()
            week_presence_rate = round((present_week_records / total_week_records * 100), 1) if total_week_records > 0 else 100.0

            # Classe la plus absente
            worst_class_abs = ClassRoom.objects.annotate(
                abs_c=Count('enrollments__attendances', filter=Q(enrollments__attendances__status='ABSENT'))
            ).order_by('-abs_c').first()
            worst_class_abs_name = f"{worst_class_abs.name} ({worst_class_abs.abs_c} absences)" if worst_class_abs else "Aucune"

            # Élèves les plus absents
            top_absent_students_qs = Attendance.objects.filter(
                status='ABSENT'
            ).values('enrollment__student__first_name', 'enrollment__student__last_name', 'enrollment__classroom__name').annotate(
                total_abs=Count('id')
            ).order_by('-total_abs')[:5]

            top_absent_students_list = [
                f"{s['enrollment__student__first_name']} {s['enrollment__student__last_name']} ({s['enrollment__classroom__name']}) : {s['total_abs']} absence(s)"
                for s in top_absent_students_qs if s.get('enrollment__student__first_name')
            ]
        except Exception as err:
            total_students = 0
            total_teachers = 0
            total_classes = 0
            top_class_name = "Non disponible"
            recettes_totales = 0
            recettes_mois_actuel = 0
            recettes_mois_dernier = 0
            depenses_totales = 0
            depenses_mois_actuel = 0
            net_balance = 0
            top_expense_cat_name = "Aucune"
            unpaid_count = 0
            unpaid_sum = 0
            unpaid_students_list = []
            acomptes_count = 0
            acomptes_list = []
            teachers_payroll_summary = []
            today_absences = 0
            week_presence_rate = 100.0
            worst_class_abs_name = "Aucune"
            top_absent_students_list = []

        context_data = {
            "nom_etablissement": school.name if school else "Établissement",
            "date_du_jour": str(today),
            "effectifs": {
                "total_eleves": total_students,
                "total_enseignants": total_teachers,
                "total_classes": total_classes,
                "classe_la_plus_peuplee": top_class_name,
            },
            "finances_calculs_django": {
                "recettes_totales_fcfa": float(recettes_totales),
                "recettes_mois_actuel_fcfa": float(recettes_mois_actuel),
                "recettes_mois_dernier_fcfa": float(recettes_mois_dernier),
                "depenses_totales_fcfa": float(depenses_totales),
                "depenses_mois_actuel_fcfa": float(depenses_mois_actuel),
                "benefice_net_fcfa": float(net_balance),
                "poste_depense_le_plus_cher": top_expense_cat_name,
                "impayes": {
                    "nombre": unpaid_count,
                    "montant_total_fcfa": float(unpaid_sum),
                    "exemples_eleves": unpaid_students_list
                },
                "acomptes": {
                    "nombre": acomptes_count,
                    "exemples_eleves": acomptes_list
                }
            },
            "enseignants_et_paie_calculs_django": teachers_payroll_summary,
            "presences_et_absences_calculs_django": {
                "taux_presence_semaine_pct": week_presence_rate,
                "absences_aujourdhui": today_absences,
                "classe_la_plus_absente": worst_class_abs_name,
                "eleves_les_plus_absents": top_absent_students_list
            }
        }

        system_instruction = (
            f"Vous êtes l'Assistant IA officiel d'analyse et de rédaction de rapports pour l'établissement scolaire {context_data['nom_etablissement']}.\n"
            "RÈGLE N°1 CRITIQUE : Tous les calculs financiers (recettes, dépenses, bénéfices, salaires, taux de présence) ont DÉJÀ ÉTÉ CALCULÉS AVEC EXACTITUDE PAR DJANGO dans les données ci-dessous.\n"
            "Vous NE DEVEZ PAS réinventer ou recalculer ces chiffres. Votre rôle est d'analyser, d'expliquer, de comparer, de résumer et de rédiger des rapports structurés et professionnels.\n"
            "Utilisez le symbole FCFA, des puces claires, du gras et des tableaux en Markdown si pertinent.\n\n"
            f"DONNÉES OFFICIELLES CALCULÉES PAR DJANGO:\n{json.dumps(context_data, ensure_ascii=False, indent=2)}\n"
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
                            "source": f"API IA xAI ({model_name})"
                        })
                except Exception:
                    continue

        # Fallback intelligent 100% calculé par Django pour toutes les questions prédéfinies
        prompt_lower = prompt.lower()

        # 1. Comparatif / Mensuel / Recettes / Dépenses / Bénéfice
        if any(w in prompt_lower for w in ["mois", "actuel", "dernier", "compare", "janvier", "février", "poste", "dépense", "bénéfice", "recette", "encais"]) and not "rapport" in prompt_lower:
            reply = (
                f"### 💰 Bilan & Analyse Financière Mensuelle - {context_data['nom_etablissement']}\n\n"
                f"*Tous les chiffres ci-dessous sont issus du calcul automatique par le moteur Django :*\n\n"
                f"- **Recettes ce mois-ci :** `{recettes_mois_actuel:,.0f} FCFA`\n"
                f"- **Recettes le mois dernier :** `{recettes_mois_dernier:,.0f} FCFA`\n"
                f"- **Variation Mensuelle :** `{('+' if recettes_mois_actuel >= recettes_mois_dernier else '')}{float(recettes_mois_actuel - recettes_mois_dernier):,.0f} FCFA`\n"
                f"- **Dépenses ce mois-ci :** `{depenses_mois_actuel:,.0f} FCFA` (Dépenses totales cumulées: `{depenses_totales:,.0f} FCFA`)\n"
                f"- **Poste de dépense le plus élevé :** `{top_expense_cat_name}`\n"
                f"- **Bénéfice Net Global :** `{net_balance:,.0f} FCFA`\n\n"
                "💡 **Analyse & Recommandation :** " +
                ("La dynamique de recettes du mois est positive par rapport au mois précédent." if recettes_mois_actuel >= recettes_mois_dernier else "Les recettes du mois accusent une légère baisse. Une relance des frais de scolarité est conseillée.")
            )

        # 2. Impayés & Acomptes
        elif any(w in prompt_lower for w in ["impayé", "acompte", "pas encore payé", "non payé"]):
            unpaid_formatted = "\n".join([f"- 🔴 {s}" for s in unpaid_students_list]) if unpaid_students_list else "- Aucun élève en impayé enregistré."
            acomptes_formatted = "\n".join([f"- 🟠 {s}" for s in acomptes_list]) if acomptes_list else "- Aucun acompte partiel enregistré."
            reply = (
                f"### 📋 État des Frais Scolaires & Acomptes\n\n"
                f"- **Nombre d'échéances impayées :** `{unpaid_count}` (Total cumulé : `{unpaid_sum:,.0f} FCFA`)\n"
                f"- **Nombre d'élèves avec acompte partiel :** `{acomptes_count}`\n\n"
                f"#### 🔴 Échantillon d'élèves en impayé :\n{unpaid_formatted}\n\n"
                f"#### 🟠 Échantillon d'élèves ayant versé un acompte :\n{acomptes_formatted}\n\n"
                "💡 **Recommandation :** Exportez la liste des relances SMS depuis le module Finance pour notifier automatiquement les responsables."
            )

        # 3. Enseignants, Heures & Salaires
        elif any(w in prompt_lower for w in ["enseignant", "prof", "salaire", "travail", "heure"]):
            payroll_table = "\n".join([
                f"| {t['nom']} | {t['heures']} h | {t['taux']:,.0f} F/h | {t['base']:,.0f} F | {t['primes']:,.0f} F | {t['cotisations']:,.0f} F | **{t['salaire_net']:,.0f} FCFA** |"
                for t in teachers_payroll_summary
            ]) if teachers_payroll_summary else "| Aucun enseignant | 0 h | 0 F | 0 F | 0 F | 0 F | **0 FCFA** |"
            reply = (
                f"### 👨‍🏫 Gestion RH, Heures Travaillées & Décompte des Salaires\n\n"
                f"*Formule appliquée par Django : (Heures Validées × Taux Horaire) + Salaire de Base + Primes - Cotisations*\n\n"
                f"| Enseignant | Heures Validées | Taux/h | Salaire Fixe | Primes | Cotisations | **Salaire Net à Payer** |\n"
                f"| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n"
                f"{payroll_table}\n\n"
                "💡 **Information :** Les fiches de paie mensuelles individuelles peuvent être générées et téléchargées au format PDF dans l'onglet **Finance & Paie RH**."
            )

        # 4. Présences & Absences
        elif any(w in prompt_lower for w in ["présence", "absence", "taux", "retard", "assiduité"]):
            top_abs_formatted = "\n".join([f"- ⚠️ {s}" for s in top_absent_students_list]) if top_absent_students_list else "- Aucune absence enregistrée."
            reply = (
                f"### 📊 Rapport d'Assiduité & Taux de Présence\n\n"
                f"- **Taux de Présence cette semaine :** `{week_presence_rate}%`\n"
                f"- **Absences signalées aujourd'hui ({today}) :** `{today_absences} élève(s)`\n"
                f"- **Classe avec le plus d'absences :** `{worst_class_abs_name}`\n\n"
                f"#### ⚠️ Élèves accumulant le plus d'absences :\n{top_abs_formatted}\n\n"
                "💡 **Action Conseillée :** Planifier un entretien pédagogique avec les parents des élèves cumulant plus de 3 absences non justifiées."
            )

        # 5. Rapport Annuel / Synthèse Globale
        elif any(w in prompt_lower for w in ["rapport", "annuel", "synthèse", "global", "complet"]):
            reply = (
                f"# 🏛️ RAPPORT ANNUEL & SYNTHÈSE GLOBALE DE L'ÉTABLISSEMENT\n"
                f"**Établissement :** {context_data['nom_etablissement']}  |  **Date d'édition :** {today}\n\n"
                "--- \n\n"
                f"### 1. 🎓 Effectifs & Organisation Pédagogique\n"
                f"- **Total Élèves Inscrits :** `{total_students}` élèves\n"
                f"- **Corps Enseignant :** `{total_teachers}` enseignants\n"
                f"- **Classes Ouvertes :** `{total_classes}` classes (Classe la plus fréquentée: `{top_class_name}`)\n\n"
                f"### 2. 💰 Bilan Financier Global (Calculs Django)\n"
                f"- **Recettes Totales Encassées :** `{recettes_totales:,.0f} FCFA`\n"
                f"- **Dépenses Totales d'Exploitation :** `{depenses_totales:,.0f} FCFA`\n"
                f"- **Résultat Net d'Exploitation (Bénéfice) :** `{net_balance:,.0f} FCFA`\n"
                f"- **Poste de Dépense Majeur :** `{top_expense_cat_name}`\n"
                f"- **Reste à Recouvrer (Impayés) :** `{unpaid_sum:,.0f} FCFA` ({unpaid_count} échéances)\n\n"
                f"### 3. 📊 Assiduité & Présences\n"
                f"- **Taux Moyen de Présence Hebdomadaire :** `{week_presence_rate}%`\n"
                f"- **Classe la Plus Touchée par les Absences :** `{worst_class_abs_name}`\n\n"
                "--- \n"
                "🎯 **Conclusion & Recommandations de l'Assistant IA :**\n"
                "1. **Recouvrement :** Accentuer le suivi des impayés pour récupérer le solde de " + f"`{unpaid_sum:,.0f} FCFA`.\n" +
                "2. **Maîtrise des Dépenses :** Surveiller particulièrement le poste `" + top_expense_cat_name + "`.\n" +
                "3. **Pédagogie :** Maintenir la présence au-dessus du seuil de 90% sur toutes les classes."
            )

        # 6. Question générale par défaut
        else:
            reply = (
                f"### 🤖 Synthèse Générale - {context_data['nom_etablissement']}\n\n"
                f"- **Élèves inscrits :** `{total_students}` | **Enseignants :** `{total_teachers}` | **Classes :** `{total_classes}`\n"
                f"- **Recettes encaissees :** `{recettes_totales:,.0f} FCFA` | **Dépenses :** `{depenses_totales:,.0f} FCFA`\n"
                f"- **Résultat Net (Bénéfice) :** `{net_balance:,.0f} FCFA`\n"
                f"- **Taux de Présence Semaine :** `{week_presence_rate}%`\n\n"
                "💡 **Vous pouvez me demander :**\n"
                "• *« Compare le mois actuel au mois dernier »*\n"
                "• *« Quels sont les élèves qui n'ont pas encore payé ? »*\n"
                "• *« Combien d'heures cet enseignant a travaillées et calcule son salaire »*\n"
                "• *« Quel est le taux de présence et quelle classe a le plus d'absences ? »*\n"
                "• *« Prépare-moi le rapport annuel complet de l'établissement »*"
            )

        return Response({"answer": reply, "context": context_data, "source": "Calculateur Django PostgreSQL"})


