from reportlab.lib.pagesizes import landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from io import BytesIO
import os
from django.conf import settings

def generate_student_id_card_pdf(enrollment):
    # Taille d'une carte d'identité standard (85.6mm x 54mm converti en points)
    # 1mm = 2.83465 points -> 85.6mm = 242.6 points, 54mm = 153.1 points
    card_size = (242.6, 153.1)
    
    buffer = BytesIO()
    # Marges à 0 pour éviter tout saut de page automatique par ReportLab
    doc = SimpleDocTemplate(buffer, pagesize=card_size, rightMargin=0, leftMargin=0, topMargin=0, bottomMargin=0)
    styles = getSampleStyleSheet()
    
    elements = []

    student = enrollment.student
    # Récupérer l'établissement lié à l'élève ou à défaut à sa classe
    school = student.school or enrollment.classroom.cycle.school
    
    # --- DESIGN SYSTEM ---
    PRIMARY_COLOR = colors.HexColor("#0f172a")  # Slate 900
    SECONDARY_COLOR = colors.HexColor("#3b82f6") # Blue 500
    TEXT_MUTED = colors.HexColor("#64748b")     # Slate 500
    ACCENT_COLOR = colors.HexColor("#f59e0b")   # Amber 500 (Or)

    # Styles textuels avec des tailles de police légèrement optimisées pour éviter tout débordement
    school_style = ParagraphStyle(
        'SchoolTitle', 
        fontSize=7.5, 
        textColor=colors.white, 
        fontName='Helvetica-Bold',
        leading=8.5,
        alignment=0
    )
    card_title_style = ParagraphStyle(
        'CardTitle', 
        fontSize=6, 
        textColor=ACCENT_COLOR, 
        fontName='Helvetica-Bold',
        leading=7,
        alignment=0
    )
    
    info_label_style = ParagraphStyle(
        'InfoLabel',
        fontSize=6.5,
        textColor=PRIMARY_COLOR,
        fontName='Helvetica-Bold',
        leading=8
    )
    
    # 1. LOGO ECOLE
    logo_img = None
    if school.logo and os.path.exists(school.logo.path):
        try:
            # Logo redimensionné pour s'intégrer harmonieusement dans l'en-tête
            logo_img = Image(school.logo.path, width=20, height=20)
        except Exception:
            logo_img = None

    if not logo_img:
        # Création d'un logo de secours ultra premium sans caractères spéciaux/emojis (pour éviter le carré noir Helvetica)
        initial = school.name[0].upper() if school.name else "E"
        fallback_style = ParagraphStyle('LogoFallback', fontSize=8, fontName='Helvetica-Bold', textColor=SECONDARY_COLOR, alignment=1)
        logo_img = Table(
            [[Paragraph(initial, fallback_style)]],
            colWidths=[18],
            rowHeights=[18]
        )
        logo_img.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.white),
            ('ALIGN', (0,0), (0,0), 'CENTER'),
            ('VALIGN', (0,0), (0,0), 'MIDDLE'),
            ('BOX', (0,0), (0,0), 1, SECONDARY_COLOR),
        ]))

    # En-tête : Logo à gauche (largeur 24), Titres à droite (largeur 208)
    header_table_data = [
        [logo_img, [
            Paragraph(school.name.upper(), school_style),
            Paragraph("CARTE SCOLAIRE D'IDENTITÉ", card_title_style)
        ]]
    ]
    header_table = Table(header_table_data, colWidths=[26, 206])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))

    # 2. PHOTO ELEVE (Hauteur optimisée à 48 pour éviter les sauts de page)
    photo_img = None
    if student.profile_picture and os.path.exists(student.profile_picture.path):
        try:
            photo_img = Image(student.profile_picture.path, width=44, height=52)
        except Exception:
            photo_img = None
            
    if not photo_img:
        # Silhouette alternative épurée avec initiales de l'élève
        initials = f"{student.first_name[0]}{student.last_name[0]}".upper()
        placeholder_style = ParagraphStyle('PhotoPlaceholder', fontSize=10, fontName='Helvetica-Bold', textColor=SECONDARY_COLOR, alignment=1)
        photo_img = Table(
            [[Paragraph(initials, placeholder_style)]],
            colWidths=[44],
            rowHeights=[52]
        )
        photo_img.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor("#eff6ff")),
            ('ALIGN', (0,0), (0,0), 'CENTER'),
            ('VALIGN', (0,0), (0,0), 'MIDDLE'),
            ('BOX', (0,0), (0,0), 1.5, SECONDARY_COLOR),
            ('PADDING', (0,0), (-1,-1), 0),
        ]))

    # 3. INFORMATIONS DE L'ELEVE
    matricule = student.matricule or f"E-{student.id:04d}"
    details_data = [
        [Paragraph(f"NOM: <font color='#3b82f6'>{student.last_name.upper()}</font>", info_label_style)],
        [Paragraph(f"PRÉNOM: <font color='#475569'>{student.first_name}</font>", info_label_style)],
        [Paragraph(f"CLASSE: <font color='#475569'>{enrollment.classroom.name}</font>", info_label_style)],
        [Paragraph(f"MATRICULE: <font color='#0f172a'><b>{matricule}</b></font>", info_label_style)],
        [Paragraph(f"ANNÉE: <font color='#475569'>{enrollment.academic_year.name}</font>", info_label_style)]
    ]
    details_table = Table(details_data, colWidths=[174])
    details_table.setStyle(TableStyle([
        ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
        ('TOPPADDING', (0,0), (-1,-1), 0.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))

    # Section principale : Photo à gauche, Détails à droite
    main_section_data = [
        [photo_img, details_table]
    ]
    main_section_table = Table(main_section_data, colWidths=[50, 182])
    main_section_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))

    # 4. ZONE DE SIGNATURES
    sig_label_style = ParagraphStyle('SigLabel', fontSize=5, fontName='Helvetica-Bold', textColor=TEXT_MUTED, alignment=1)
    sig_space = Paragraph("....................................................", ParagraphStyle('Dots', fontSize=4.5, textColor=TEXT_MUTED, alignment=1))
    
    signatures_data = [
        [
            [Paragraph("Signature de l'Élève", sig_label_style), Spacer(1, 3), sig_space],
            [Paragraph("Le Directeur de l'École", sig_label_style), Spacer(1, 3), sig_space]
        ]
    ]
    signatures_table = Table(signatures_data, colWidths=[116, 116])
    signatures_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))

    # --- ASSEMBLAGE DE LA CARTE ---
    card_data = [
        [header_table],
        [main_section_table],
        [signatures_table]
    ]
    
    # 24 (Header) + 62 (Main) + 26 (Sigs) = 112 points de hauteur totale (Rentre parfaitement dans les 153.1 points de la carte)
    final_card = Table(card_data, colWidths=[232], rowHeights=[24, 62, 26])
    final_card.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), PRIMARY_COLOR), # En-tête bleu nuit/noir
        ('BOTTOMPADDING', (0,0), (0,0), 2),
        ('TOPPADDING', (0,0), (0,0), 2),
        ('LEFTPADDING', (0,0), (0,0), 4),
        ('RIGHTPADDING', (0,0), (0,0), 4),
        ('BACKGROUND', (0,1), (0,2), colors.white),
        ('BOX', (0,0), (-1,-1), 1.5, PRIMARY_COLOR), # Cadre de la carte
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))

    elements.append(final_card)
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_attendance_report_pdf(school, attendances, classroom_name=None, student_name=None, start_date=None, end_date=None):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from io import BytesIO
    import os

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=1,
        spaceAfter=15
    )
    
    meta_style = ParagraphStyle(
        'ReportMeta',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )

    elements = []
    
    # 1. School Header
    header_text = f"<b>{school.name.upper()}</b><br/>"
    if school.address:
        header_text += f"{school.address}<br/>"
    if school.phone_number:
        header_text += f"Tél: {school.phone_number} | "
    if school.email:
        header_text += f"Email: {school.email}"
    
    header_p = Paragraph(header_text, ParagraphStyle('HeaderStyle', fontSize=9, leading=13, textColor=colors.HexColor("#334155")))
    elements.append(header_p)
    elements.append(Spacer(1, 15))
    
    # 2. Title
    elements.append(Paragraph("RAPPORT D'ABSENCES & D'ASSIDUITÉ", title_style))
    
    # 3. Meta information block
    meta_text = ""
    if classroom_name:
        meta_text += f"<b>Classe:</b> {classroom_name} &nbsp;&nbsp;&nbsp;&nbsp;"
    if student_name:
        meta_text += f"<b>Élève:</b> {student_name} &nbsp;&nbsp;&nbsp;&nbsp;"
    
    date_str = "Toutes les dates"
    if start_date and end_date:
        date_str = f"Du {start_date} au {end_date}"
    elif start_date:
        date_str = f"Depuis le {start_date}"
    elif end_date:
        date_str = f"Jusqu'au {end_date}"
    
    meta_text += f"<b>Période:</b> {date_str}"
    elements.append(Paragraph(meta_text, meta_style))
    elements.append(Spacer(1, 15))
    
    # 4. Statistics summary cards
    total_records = len(attendances)
    absences_count = sum(1 for a in attendances if a.status == 'ABSENT')
    lates_count = sum(1 for a in attendances if a.status == 'LATE')
    presents_count = sum(1 for a in attendances if a.status == 'PRESENT')
    
    rate = 100
    if total_records > 0:
        rate = round(((presents_count + lates_count) / total_records) * 100)
    
    stats_data = [
        [
            Paragraph(f"<b>Total Appels:</b> {total_records}", meta_style),
            Paragraph(f"<b>Absences:</b> {absences_count}", meta_style),
            Paragraph(f"<b>Retards:</b> {lates_count}", meta_style),
            Paragraph(f"<b>Taux d'Assiduité:</b> {rate}%", meta_style)
        ]
    ]
    stats_table = Table(stats_data, colWidths=[130, 130, 130, 142])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 20))
    
    # 5. Data Table
    table_data = [
        [
            Paragraph("<b>Date</b>", table_header_style),
            Paragraph("<b>Élève</b>", table_header_style),
            Paragraph("<b>Classe</b>", table_header_style),
            Paragraph("<b>Matière</b>", table_header_style),
            Paragraph("<b>Statut / Motif</b>", table_header_style),
            Paragraph("<b>Commentaire / Justification</b>", table_header_style)
        ]
    ]
    
    status_map = {'PRESENT': 'Présent', 'ABSENT': 'Absent', 'LATE': 'Retard'}
    
    for a in attendances:
        subject_name = a.subject.name if a.subject else "-"
        status_display = status_map.get(a.status, a.status)
        if a.motive:
            status_display += f" ({a.get_motive_display()})"
            
        comment_display = a.comment or a.justification or "-"
        if a.is_validated:
            comment_display += " [Validé]"
            
        table_data.append([
            Paragraph(str(a.date), table_cell_style),
            Paragraph(a.enrollment.student.get_full_name(), table_cell_style),
            Paragraph(a.enrollment.classroom.name, table_cell_style),
            Paragraph(subject_name, table_cell_style),
            Paragraph(status_display, table_cell_style),
            Paragraph(comment_display, table_cell_style)
        ])
        
    data_table = Table(table_data, colWidths=[65, 110, 75, 75, 95, 112])
    data_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")])
    ]))
    
    elements.append(data_table)
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

