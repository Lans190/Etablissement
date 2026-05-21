from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from io import BytesIO
from django.db.models import Avg, Sum, F

def generate_report_card_pdf(report_card):
    enrollment = report_card.enrollment
    term = report_card.term
    student = enrollment.student
    classroom = enrollment.classroom
    school = classroom.cycle.school

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    
    elements = []

    # En-tête de l'école
    elements.append(Paragraph(f"<b>{school.name.upper()}</b>", styles['Title']))
    elements.append(Paragraph(f"{school.address} | Tel: {school.phone_number}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # Titre du bulletin
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, fontSize=18, spaceAfter=20)
    elements.append(Paragraph(f"BULLETIN DE NOTES - {term.name.upper()}", title_style))
    elements.append(Paragraph(f"Année Scolaire : {term.academic_year.name}", styles['Normal']))
    elements.append(Spacer(1, 10))

    # Infos Élève
    student_info = [
        [f"Élève : {student.get_full_name()}", f"Classe : {classroom.name}"],
        [f"Né(e) le : {student.date_joined.strftime('%d/%m/%Y')}", f"Effectif : {classroom.enrollments.count()}"]
    ]
    t_info = Table(student_info, colWidths=[250, 200])
    t_info.setStyle(TableStyle([('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold')]))
    elements.append(t_info)
    elements.append(Spacer(1, 20))

    # Tableau des notes
    header = ["Matière", "Coef", "Moy. /20", "Moy. Coef", "Appréciation"]
    data = [header]

    # Récupérer les moyennes par matière pour cette période
    from evaluations.models import Grade
    from academics.models import SubjectAllocation
    
    allocations = SubjectAllocation.objects.filter(classroom=classroom)
    
    total_points = 0
    total_coefs = 0

    for alloc in allocations:
        # Moyenne des notes de l'élève pour cette matière et ce trimestre
        avg_score = Grade.objects.filter(
            enrollment=enrollment,
            assessment__allocation=alloc,
            assessment__term=term
        ).aggregate(Avg('score'))['score__avg']

        if avg_score is not None:
            coef = alloc.coefficient
            points = avg_score * coef
            total_points += points
            total_coefs += coef
            
            data.append([
                alloc.subject.name,
                coef,
                f"{avg_score:.2f}",
                f"{points:.2f}",
                "Satisfaisant" if avg_score >= 12 else "Passable" if avg_score >= 10 else "Insuffisant"
            ])
        else:
            data.append([alloc.subject.name, alloc.coefficient, "-", "-", "-"])

    # Calcul moyenne générale
    gen_avg = total_points / total_coefs if total_coefs > 0 else 0
    report_card.general_average = gen_avg
    report_card.save()

    # Style du tableau
    t_grades = Table(data, colWidths=[150, 40, 70, 70, 120])
    t_grades.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.blue),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_grades)
    elements.append(Spacer(1, 20))

    # Résumé
    summary_data = [
        [f"TOTAL POINTS : {total_points:.2f}", f"MOYENNE GÉNÉRALE : {gen_avg:.2f} / 20"]
    ]
    t_sum = Table(summary_data, colWidths=[225, 225])
    t_sum.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('BACKGROUND', (0,0), (-1,-1), colors.lightgrey),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ]))
    elements.append(t_sum)
    elements.append(Spacer(1, 40))

    # Signatures
    sig_data = [["Le Titulaire", "Le Parent", "Le Directeur"]]
    t_sig = Table(sig_data, colWidths=[150, 150, 150])
    elements.append(t_sig)

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
