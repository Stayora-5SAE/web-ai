"""Build the concise French professor report from verified local analysis evidence."""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, PageBreak, Image

base = Path(__file__).resolve().parent
data = json.loads((base / 'evidence/sonarqube.json').read_text())
verified = json.loads((base / 'evidence/verification.json').read_text())
metrics = {x['metric']: x['value'] for x in data['metrics']['component']['measures']}
assert data['analysis']['status'] == 'SUCCESS'
assert verified['backend']['tests'] == 51 and verified['frontend']['tests'] == 33
assert verified['workflow']['tests'] == 6
assert verified['eslint'] == {'files': 53, 'errors': 0, 'warnings': 1}

font_dir = Path('C:/Windows/Fonts')
if font_dir.exists():
    pdfmetrics.registerFont(TTFont('Report', str(font_dir / 'arial.ttf')))
    pdfmetrics.registerFont(TTFont('ReportBold', str(font_dir / 'arialbd.ttf')))
else:
    pdfmetrics.registerFont(TTFont('Report', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('ReportBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('Report', normal='Report', bold='ReportBold', italic='Report', boldItalic='ReportBold')
green = colors.HexColor('#155d57')
grey = colors.HexColor('#33433f')
body = ParagraphStyle('Body', fontName='Report', fontSize=10, leading=14, textColor=grey, spaceAfter=6)
title = ParagraphStyle('Title', parent=body, fontName='ReportBold', fontSize=22, leading=27, textColor=green, spaceAfter=8)
heading = ParagraphStyle('Heading', parent=body, fontName='ReportBold', fontSize=12, leading=17, textColor=green, spaceBefore=8, spaceAfter=6)
cell = ParagraphStyle('Cell', parent=body, fontSize=9.5, leading=13, spaceAfter=0)
small = ParagraphStyle('Small', parent=body, fontSize=8, leading=11, spaceAfter=5)
page_width, page_height = landscape(A4)
width = page_width - 72

def pct(value):
    return value.replace('.', ',') + ' %'

def coverage(prefix):
    for component in data['modules']['components']:
        if component['path'] == prefix:
            return next(x['value'] for x in component['measures'] if x['metric'] == 'coverage')
    raise ValueError('Missing measured module coverage: ' + prefix)

backend_coverage = coverage('backend/src')
frontend_coverage = coverage('frontend/src')
code_lines = format(int(metrics['ncloc']), ',').replace(',', ' ')
distinct = str(data['issues']['paging']['total'])
gate = 'validé' if data['gate']['projectStatus']['status'] == 'OK' else 'refusé'
rows = [
    ['Vérification', 'Résultat'],
    ['Tests Java : dates, capacité, concurrence, autorisations, prix TND, IA', '51 réussis ; 0 échec'],
    ['Tests Angular : contrats HTTP, erreurs API et interfaces', '33 réussis ; 0 échec'],
    ['Processus SonarQube : URL locale, base isolée, rapports requis', '6 réussis ; 0 échec'],
    ['ESLint : 53 fichiers TypeScript / HTML', '0 erreur ; 1 avertissement'],
    ['Couverture SonarQube : Java / Angular / total', f'{pct(backend_coverage)} / {pct(frontend_coverage)} / {pct(metrics["coverage"])}'],
    ['Duplication du code', pct(metrics['duplicated_lines_density'])],
    ['Signalements ouverts distincts', distinct],
    ['Qualités logicielles : sécurité / fiabilité / maintenabilité', f'0 (A) / {metrics["software_quality_reliability_issues"]} (C) / {metrics["software_quality_maintainability_issues"]} (A)'],
]
elements = [
    Paragraph('Stayora - Rapport de tests', title),
    Paragraph('11 octobre 2026 | Analyse statique et couverture des tests', body),
    Paragraph('Aymen Hmani · Hadir Ghallabi · Kawther Lahneynè · Rania Regai · Wassim Hamouda', small),
    Paragraph('Méthode et périmètre', heading),
    Paragraph(f'SonarQube Community {data["serverVersion"]}, installé sous Windows sans Docker ; SonarScanner 8.1.0.6389 et profils « Sonar way ». Analyse du code local Java, TypeScript, HTML, CSS et YAML, avec les tests. {metrics["files"]} fichiers de production ; {code_lines} lignes de code hors commentaires. Couverture importée depuis JaCoCo 0.8.15 et LCOV ; fichiers de production absents des rapports comptés comme non couverts.', body),
]
table = Table([[Paragraph(escape(v), cell) for v in row] for row in rows], colWidths=[width * .56, width * .44])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6f2ec')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LINEBELOW', (0, 0), (-1, 0), .7, green),
    ('LINEBELOW', (0, 1), (-1, -1), .25, colors.HexColor('#d4e1db')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
elements += [table, Spacer(1, 7),
    Paragraph(f'Interprétation : portail qualité {gate} pour le nouveau code (0 nouveau signalement). Les {distinct} signalements globaux restent ouverts ; un signalement peut concerner plusieurs qualités logicielles.', body),
    Paragraph('Actions : examiner les expressions régulières signalées par S8786 et renforcer les tests Angular. Vérifier S2699 sur le test d’annulation : une assertion asynchrone <font name="ReportBold">expectAsync(...).toBeRejected()</font> est déjà présente. L’avertissement ESLint concerne <font name="ReportBold">console.error</font> dans <font name="ReportBold">main.ts:20</font>.', body),
    Paragraph('Limites : édition Community sans analyse avancée des injections ; avertissements du scanner sur des types Java et des attributions Git non résolus. Les tests sont exécutés sur PostgreSQL local ; le code analysé n’est pas encore commité. Preuves, empreintes et résultats bruts : dossier <font name="ReportBold">evidence/</font>.', small),
    PageBreak(),
    Paragraph('1. Tableau de bord SonarQube', heading),
    Paragraph(f'Code global : couverture {pct(metrics["coverage"])} ; duplication {pct(metrics["duplicated_lines_density"])} ; fiabilité C. Capture réelle du 11 octobre 2026.', body),
]

def screenshot(filename):
    image = Image(str(base / 'screenshots' / filename))
    factor = min(width / image.imageWidth, 465 / image.imageHeight)
    image.drawWidth = image.imageWidth * factor
    image.drawHeight = image.imageHeight * factor
    return image

elements += [screenshot('tableau-de-bord.png'), PageBreak(),
    Paragraph('2. Signalements SonarQube', heading),
    Paragraph(f'{distinct} signalements ouverts. Exemples : S8786, risque de performance des expressions régulières dans <font name="ReportBold">AiPrivacy.java:113,116</font> et <font name="ReportBold">ConfiguredAiProvider.java:35</font>. Les alertes nécessitent une revue du code.', body),
    screenshot('signalements.png'),
]

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(grey)
    canvas.setFont('Report', 8)
    canvas.drawString(36, 20, 'Stayora | Tests logiciels | 11 octobre 2026')
    canvas.drawRightString(page_width - 36, 20, f'{doc.page} / 3')
    canvas.restoreState()

SimpleDocTemplate(str(base / 'rapport.pdf'), pagesize=landscape(A4), leftMargin=36, rightMargin=36, topMargin=30, bottomMargin=34,
    title='Stayora - Rapport de tests', author='Groupe Stayora', subject='Résultats SonarQube, ESLint et couverture des tests').build(elements, onFirstPage=footer, onLaterPages=footer)

markdown = f'''# Stayora - Rapport de tests

11 octobre 2026. Aymen Hmani, Hadir Ghallabi, Kawther Lahneynè, Rania Regai, Wassim Hamouda.

## Méthode

SonarQube Community {data['serverVersion']} sous Windows, sans Docker ; SonarScanner 8.1.0.6389, profils « Sonar way ». Analyse Java, TypeScript, HTML, CSS et YAML, avec les tests. {metrics['files']} fichiers de production, {metrics['ncloc']} lignes hors commentaires. Couverture JaCoCo 0.8.15 et LCOV ; fichiers de production absents des rapports comptés comme non couverts.

| Vérification | Résultat |
| --- | --- |
'''
markdown += '\n'.join('| ' + ' | '.join(row) + ' |' for row in rows[1:])
markdown += f'''

Le portail qualité est {gate} pour le nouveau code (0 nouveau signalement). Les {distinct} signalements globaux restent ouverts ; un signalement peut concerner plusieurs qualités logicielles.

## Constats

- S8786 : expressions régulières à examiner dans `AiPrivacy.java:113,116` et `ConfiguredAiProvider.java:35`.
- S2699 : vérifier l'alerte du test d'annulation ; `expectAsync(...).toBeRejected()` est déjà présent.
- ESLint : avertissement `console.error`, `frontend/src/main.ts:20`.
- Couverture Angular : {pct(frontend_coverage)}, à renforcer.

Édition Community sans analyse avancée des injections. Avertissements du scanner sur des types Java et des attributions Git non résolus. Tests sur PostgreSQL local ; code local non encore commité. Résultats bruts et empreintes : [preuves](evidence/verification.json).

## Captures réelles

![Tableau de bord SonarQube](screenshots/tableau-de-bord.png)

![Signalements ouverts dans SonarQube](screenshots/signalements.png)
'''
(base / 'rapport.md').write_text(markdown, encoding='utf-8')
print('French report generated from verified evidence: rapport.pdf and rapport.md.')
