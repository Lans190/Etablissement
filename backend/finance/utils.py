from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from io import BytesIO

def generate_payment_receipt_pdf(payment):
    buffer = BytesIO()
    # Format A5 pour les reçus (plus pratique)
    doc = SimpleDocTemplate(buffer, pagesize=A5, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    elements = []

    # En-tête
    school = payment.fee_allocation.enrollment.classroom.cycle.school
    elements.append(Paragraph(f"<b>{school.name.upper()}</b>", styles['Title']))
    elements.append(Paragraph(school.address, styles['Normal']))
    elements.append(Paragraph(f"Tel: {school.phone_number}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # Titre du reçu
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=20)
    elements.append(Paragraph(f"REÇU DE PAIEMENT N° {payment.id}", title_style))
    elements.append(Spacer(1, 10))

    # Infos élève et paiement
    data = [
        ["Date :", payment.payment_date.strftime("%d/%m/%Y %H:%M")],
        ["Élève :", payment.fee_allocation.enrollment.student.get_full_name()],
        ["Classe :", payment.fee_allocation.enrollment.classroom.name],
        ["Objet :", payment.fee_allocation.fee_type.name],
        ["Mode :", payment.get_payment_method_display()],
    ]

    if payment.transaction_id:
        data.append(["ID Transaction :", payment.transaction_id])

    t = Table(data, colWidths=[100, 200])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # Montant
    amount_data = [[f"MONTANT PAYÉ : {int(payment.amount_paid):,} FCFA".replace(",", " ")]]
    amount_table = Table(amount_data, colWidths=[300])
    amount_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.black),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTSIZE', (0,0), (-1,-1), 14),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(amount_table)
    elements.append(Spacer(1, 30))

    # Signatures
    sig_data = [["Signature Parent", "Cachet Comptabilité"]]
    sig_table = Table(sig_data, colWidths=[150, 150])
    elements.append(sig_table)

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_payslip_pdf(payslip):
    from reportlab.lib.pagesizes import letter
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    elements = []

    school = payslip.school
    school_name = school.name.upper() if school else "ÉTABLISSEMENT SCHOLAIRE"
    school_addr = school.address if school else ""
    school_phone = school.phone_number if school else ""

    # Header
    elements.append(Paragraph(f"<b>{school_name}</b>", styles['Title']))
    if school_addr:
        elements.append(Paragraph(school_addr, styles['Normal']))
    if school_phone:
        elements.append(Paragraph(f"Tél: {school_phone}", styles['Normal']))
    elements.append(Spacer(1, 15))

    # Title
    title_style = ParagraphStyle('PayslipTitle', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=15)
    elements.append(Paragraph(f"BULLETIN DE SALAIRE - {payslip.month:02d}/{payslip.year}", title_style))
    elements.append(Spacer(1, 10))

    # Teacher details
    teacher = payslip.teacher
    teacher_data = [
        ["Nom & Prénom :", teacher.get_full_name(), "Matricule :", teacher.matricule or "-"],
        ["Fonction :", "Enseignant", "Statut Paie :", "PAYÉ" if payslip.is_paid else "EN ATTENTE"],
    ]
    t_teacher = Table(teacher_data, colWidths=[110, 180, 90, 150])
    t_teacher.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_teacher)
    elements.append(Spacer(1, 15))

    # Salary breakdown table
    hours_worked = float(payslip.hours_worked or 0)
    hourly_rate = float(payslip.hourly_rate or 0)
    hours_pay = hours_worked * hourly_rate
    base_sal = float(payslip.base_salary or 0)
    bonus = float(payslip.bonus or 0)
    overtime = float(payslip.overtime_pay or 0)
    deductions = float(payslip.deductions or 0)
    advances = float(payslip.advances or 0)
    net_sal = float(payslip.net_salary or 0)

    salary_table_data = [
        ["Rubrique", "Nombre / Base", "Taux", "Montant (FCFA)"],
        ["Salaire de base", "1", f"{base_sal:,.0f}", f"{base_sal:,.0f}"],
        ["Heures d'enseignement validées", f"{hours_worked:.1f} h", f"{hourly_rate:,.0f}", f"{hours_pay:,.0f}"],
        ["Primes & Gratifications", "-", "-", f"{bonus:,.0f}"],
        ["Heures supplémentaires", "-", "-", f"{overtime:,.0f}"],
        ["Retenues / Cotisations", "-", "-", f"-{deductions:,.0f}"],
        ["Avances sur salaire", "-", "-", f"-{advances:,.0f}"],
    ]
    t_salary = Table(salary_table_data, colWidths=[200, 100, 100, 130])
    t_salary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_salary)
    elements.append(Spacer(1, 15))

    # Net Salary Box
    net_data = [[f"NET À PAYER : {int(net_sal):,} FCFA".replace(",", " ")]]
    net_table = Table(net_data, colWidths=[530])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#065f46")),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTSIZE', (0,0), (-1,-1), 14),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 30))

    # Signatures
    sig_data = [["Signature de l'Employé", "Cachet & Signature de l'Établissement"]]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_payroll_journal_pdf(payslips, month, year, school):
    from reportlab.lib.pagesizes import letter, landscape
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    elements = []

    school_name = school.name.upper() if school else "ÉTABLISSEMENT SCHOLAIRE"
    elements.append(Paragraph(f"<b>{school_name}</b>", styles['Title']))
    elements.append(Spacer(1, 10))

    title_style = ParagraphStyle('JournalTitle', parent=styles['Heading1'], alignment=1, fontSize=16, spaceAfter=15)
    elements.append(Paragraph(f"JOURNAL RÉCAPITULATIF DES PAIES - MOIS : {month:02d}/{year}", title_style))
    elements.append(Spacer(1, 10))

    table_data = [
        ["N°", "Enseignant", "Matricule", "Heures", "Taux H.", "Sal. Base", "Sal. Heures", "Net à Payer (FCFA)", "Statut"]
    ]

    total_hours = 0
    total_net = 0

    for idx, p in enumerate(payslips, 1):
        hw = float(p.hours_worked or 0)
        hr = float(p.hourly_rate or 0)
        bs = float(p.base_salary or 0)
        sh = hw * hr
        net = float(p.net_salary or 0)

        total_hours += hw
        total_net += net

        table_data.append([
            str(idx),
            p.teacher.get_full_name(),
            p.teacher.matricule or "-",
            f"{hw:.1f} h",
            f"{hr:,.0f}",
            f"{bs:,.0f}",
            f"{sh:,.0f}",
            f"{net:,.0f}",
            "Payé" if p.is_paid else "En attente"
        ])

    table_data.append([
        "TOTAL", "", "", f"{total_hours:.1f} h", "", "", "", f"{total_net:,.0f}", ""
    ])

    t = Table(table_data, colWidths=[30, 140, 70, 60, 60, 75, 75, 110, 70])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (3,0), (-2,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (-1,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#f1f5f9")),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t)

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

