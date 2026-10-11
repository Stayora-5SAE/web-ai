"""Conversion locale du rapport français ; nécessite ReportLab déjà disponible."""
from pathlib import Path
import html
import re
import textwrap
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted

ici = Path(__file__).resolve().parent
polices = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('RapportArial', str(polices / 'arial.ttf')))
pdfmetrics.registerFont(TTFont('RapportArialBold', str(polices / 'arialbd.ttf')))
pdfmetrics.registerFontFamily('RapportArial', normal='RapportArial', bold='RapportArialBold', italic='RapportArial', boldItalic='RapportArialBold')
vert = colors.HexColor('#155d57')
gris = colors.HexColor('#384843')
styles = getSampleStyleSheet()
corps = ParagraphStyle('Corps', fontName='RapportArial', fontSize=9.4, leading=14, textColor=gris, spaceAfter=8, splitLongWords=True, allowWidows=0, allowOrphans=0)
titre = ParagraphStyle('TitreRapport', parent=corps, fontName='RapportArialBold', fontSize=24, leading=29, textColor=vert, spaceAfter=16)
section = ParagraphStyle('SectionRapport', parent=corps, fontName='RapportArialBold', fontSize=13, leading=18, textColor=vert, spaceBefore=15, spaceAfter=7, keepWithNext=True)
sous = ParagraphStyle('SousSectionRapport', parent=section, fontSize=10.5, leading=15, spaceBefore=10)
cellule = ParagraphStyle('Cellule', parent=corps, fontSize=8.6, leading=12, spaceAfter=0)
code = ParagraphStyle('CodeRapport', fontName='Courier', fontSize=7.5, leading=10.5, textColor=gris, spaceAfter=10)

def balises(texte):
    texte = html.escape(texte)
    texte = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<link href="' + m[2] + '" color="#155d57">' + m[1] + '</link>', texte)
    texte = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', texte)
    return re.sub(r'`([^`]+)`', r'<font name="Courier" size="8">\1</font>', texte)

def pied(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#d4e1db'))
    canvas.line(44, 42, A4[0] - 44, 42)
    canvas.setFont('RapportArial', 8)
    canvas.setFillColor(gris)
    canvas.drawString(44, 29, 'Stayora | Test statique | 11 octobre 2026')
    canvas.drawRightString(A4[0] - 44, 29, 'Page ' + str(document.page))
    canvas.restoreState()

lignes = (ici / 'rapport.md').read_text(encoding='utf-8').splitlines()
elements = []
i = 0
while i < len(lignes):
    ligne = lignes[i]
    if not ligne.strip():
        i += 1
        continue
    if ligne.startswith('```'):
        bloc = []
        i += 1
        while i < len(lignes) and not lignes[i].startswith('```'):
            bloc.extend(textwrap.wrap(lignes[i], width=100, break_long_words=True, break_on_hyphens=False, replace_whitespace=False, drop_whitespace=False) or [''])
            i += 1
        elements.append(Preformatted('\n'.join(bloc), code))
    elif ligne.startswith('|'):
        lignes_tableau = []
        while i < len(lignes) and lignes[i].startswith('|'):
            valeurs = [s.strip() for s in lignes[i].strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?', s) for s in valeurs):
                lignes_tableau.append([Paragraph(balises(s), cellule) for s in valeurs])
            i += 1
        largeur = A4[0] - 88
        tableau = Table(lignes_tableau, colWidths=[largeur * 0.63, largeur * 0.37], repeatRows=1, hAlign='LEFT')
        tableau.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f2ec')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, 0), 0.7, vert),
            ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.HexColor('#d4e1db')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.extend([tableau, Spacer(1, 10)])
        continue
    elif ligne.startswith('# '):
        elements.append(Paragraph(balises(ligne[2:]), titre))
    elif ligne.startswith('## '):
        elements.append(Paragraph(balises(ligne[3:]), section))
    elif ligne.startswith('### '):
        elements.append(Paragraph(balises(ligne[4:]), sous))
    elif ligne.startswith('- '):
        elements.append(Paragraph(balises(ligne[2:]), corps, bulletText='•'))
    elif re.match(r'^\d+\. ', ligne):
        numero, texte = ligne.split('. ', 1)
        elements.append(Paragraph(balises(texte), corps, bulletText=numero + '.'))
    else:
        elements.append(Paragraph(balises(ligne), corps))
    i += 1

destination = ici / 'rapport.pdf'
document = SimpleDocTemplate(str(destination), pagesize=A4, rightMargin=44, leftMargin=44, topMargin=43, bottomMargin=58, title='Rapport de test statique - Stayora', subject='Analyse locale ESLint et preuves de préservation')
document.build(elements, onFirstPage=pied, onLaterPages=pied)
print('PDF créé :', destination)
