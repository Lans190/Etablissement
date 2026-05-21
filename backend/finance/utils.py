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
