// Utilitaire universel d'impression et d'exportation PDF avec en-tête institutionnel SeneSchool

interface SchoolProfile {
  school_name?: string;
  school_logo?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
}

export const printDocument = (
  title: string,
  contentHtml: string,
  userProfile?: SchoolProfile
) => {
  const profile = userProfile || JSON.parse(localStorage.getItem('user_profile') || '{}');

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres surgissantes (popups) pour pouvoir imprimer les documents.");
    return;
  }

  const logoHtml = profile.school_logo
    ? `<img src="${profile.school_logo}" style="max-height: 70px; max-width: 150px; object-fit: contain;" alt="Logo" />`
    : `<div style="font-weight: 900; font-size: 24px; color: #1e3a8a;">${profile.school_name || 'ÉTABLISSEMENT SÉNEGAL'}</div>`;

  const fullDoc = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
        .header-table { width: 100%; border-bottom: 3px double #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
        .header-left { width: 50%; text-align: left; vertical-align: middle; }
        .header-right { width: 50%; text-align: right; vertical-align: middle; font-size: 11px; color: #475569; }
        .doc-title { text-align: center; margin: 25px 0 20px 0; text-transform: uppercase; font-weight: 800; font-size: 18px; color: #0f172a; letter-spacing: 1px; }
        .doc-title span { border-bottom: 2px solid #0284c7; padding-bottom: 4px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        table.data-table th { background-color: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
        table.data-table td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
        table.data-table tr:nth-child(even) { background-color: #f8fafc; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
        .badge-success { background-color: #dcfce7; color: #15803d; }
        .badge-warning { background-color: #fef9c3; color: #a16207; }
        .badge-danger { background-color: #fee2e2; color: #b91c1c; }
        .footer-stamp { margin-top: 40px; width: 100%; }
        .footer-stamp td { width: 50%; vertical-align: top; text-align: center; }
        .stamp-box { border: 1px dashed #cbd5e1; min-height: 100px; padding: 10px; border-radius: 8px; font-size: 11px; color: #64748b; }
        .print-date { font-size: 10px; color: #94a3b8; text-align: right; margin-top: 30px; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="header-left">
            ${logoHtml}
            <div style="font-weight: 700; font-size: 14px; margin-top: 4px; color: #0f172a;">${profile.school_name || 'Établissement Scolaire'}</div>
          </td>
          <td class="header-right">
            ${profile.school_address ? `<div>📍 ${profile.school_address}</div>` : ''}
            ${profile.school_phone ? `<div>📞 ${profile.school_phone}</div>` : ''}
            ${profile.school_email ? `<div>✉️ ${profile.school_email}</div>` : ''}
            <div style="margin-top: 4px; font-weight: 600; color: #0284c7;">République du Sénégal</div>
          </td>
        </tr>
      </table>

      <div class="doc-title"><span>${title}</span></div>

      <div class="content-body">
        ${contentHtml}
      </div>

      <table class="footer-stamp">
        <tr>
          <td>
            <div class="stamp-box">
              <strong>Signature de l'Agent / Responsable</strong><br/><br/>
            </div>
          </td>
          <td>
            <div class="stamp-box">
              <strong>Cachet Officiel de l'Établissement</strong><br/><br/>
            </div>
          </td>
        </tr>
      </table>

      <div class="print-date">Document imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} — Plateforme SaaS SeneSchool</div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullDoc);
  printWindow.document.close();
};
