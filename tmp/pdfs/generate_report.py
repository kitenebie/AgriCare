from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib.utils import ImageReader

root = Path.cwd()
tmp = root / 'tmp' / 'pdfs'
out = root / 'output' / 'pdf' / 'usb-debug-animal-global-request-test-report.pdf'
shots = {
    'type': tmp / 'type-options.png',
    'breeds': tmp / 'breed-options.png',
    'saved': tmp / 'animal-saved.png',
    'request_animal': tmp / 'request-animal-record.png',
    'review': tmp / 'request-review.png',
    'blocked': tmp / 'request-submit-result.png',
}
for label, path in shots.items():
    if not path.is_file():
        raise FileNotFoundError(f'Missing screenshot {label}: {path}')

GREEN = colors.HexColor('#087F52')
DARK = colors.HexColor('#16233B')
MUTED = colors.HexColor('#657287')
PALE = colors.HexColor('#EAF7F0')
RED = colors.HexColor('#B4232E')
BORDER = colors.HexColor('#DCEBE2')
PAGE_W, PAGE_H = A4

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GREEN)
    canvas.rect(0, PAGE_H - 8, PAGE_W, 8, stroke=0, fill=1)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 12*mm, 'AgriCare | USB device QA test')
    canvas.drawRightString(PAGE_W - 18*mm, 12*mm, f'Page {doc.page}')
    canvas.restoreState()

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleGreen', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=30, textColor=DARK, alignment=0, spaceAfter=8))
styles.add(ParagraphStyle(name='Sub', parent=styles['Normal'], fontSize=11, leading=16, textColor=MUTED, spaceAfter=8))
styles.add(ParagraphStyle(name='H2Green', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=DARK, spaceBefore=0, spaceAfter=7))
styles.add(ParagraphStyle(name='BodyQA', parent=styles['BodyText'], fontSize=10, leading=15, textColor=DARK, spaceAfter=5))
styles.add(ParagraphStyle(name='SmallQA', parent=styles['BodyText'], fontSize=8.5, leading=12, textColor=MUTED))
styles.add(ParagraphStyle(name='CaptionQA', parent=styles['BodyText'], fontSize=9, leading=12, textColor=DARK, alignment=TA_CENTER, spaceBefore=6))
styles.add(ParagraphStyle(name='StatusQA', parent=styles['BodyText'], fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=RED))


def screenshot_cell(path, caption, max_w=245, max_h=535):
    iw, ih = ImageReader(str(path)).getSize()
    scale = min(max_w / iw, max_h / ih)
    img = Image(str(path), width=iw * scale, height=ih * scale)
    return [img, Paragraph(caption, styles['CaptionQA'])]


def screenshot_pair(left, left_caption, right, right_caption):
    data = [[screenshot_cell(left, left_caption), screenshot_cell(right, right_caption)]]
    table = Table(data, colWidths=[(PAGE_W-36*mm-8*mm)/2]*2, hAlign='CENTER')
    table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3), ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    return table

story = []
story += [Spacer(1, 18*mm), Paragraph('Animal Registration and<br/>Global Service Request', styles['TitleGreen']),
          Paragraph('USB debugging end-to-end test report', styles['Sub']), Spacer(1, 5*mm)]
meta = [
    [Paragraph('<b>Test date</b>', styles['BodyQA']), Paragraph('20 November 2026', styles['BodyQA']), Paragraph('<b>Device</b>', styles['BodyQA']), Paragraph('Vivo V2310, Android 15', styles['BodyQA'])],
    [Paragraph('<b>App path</b>', styles['BodyQA']), Paragraph('AgriCare Android debug build', styles['BodyQA']), Paragraph('<b>Firebase project</b>', styles['BodyQA']), Paragraph('agecare-ca137', styles['BodyQA'])],
]
t = Table(meta, colWidths=[22*mm, 58*mm, 28*mm, 58*mm])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#F5FAF7')),('BOX',(0,0),(-1,-1),0.6,BORDER),('INNERGRID',(0,0),(-1,-1),0.4,BORDER),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [t, Spacer(1, 9*mm), Paragraph('Outcome', styles['H2Green'])]
status = Table([[Paragraph('PARTIAL PASS - request submission blocked by live backend availability', styles['StatusQA'])]], colWidths=[PAGE_W-36*mm])
status.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF2F2')),('BOX',(0,0),(-1,-1),0.7,colors.HexColor('#F1C9CC')),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),11)]))
story += [status, Spacer(1, 5*mm),
          Paragraph('<b>Passed:</b> Animal type dropdown displayed Pig, Cattle, Goat, Horse, and Carabao. Pig breed dropdown displayed the Pig-specific catalog (Large White, Landrace, Duroc, Pietrain, Hampshire). A Pig / Duroc record with quantity 1 was saved, then appeared in the Request Service animal-record selector with breed and quantity.', styles['BodyQA']),
          Paragraph('<b>Global request review:</b> Vaccination for the selected Pig / Duroc record, quantity 1, scheduled for 21 November 2026 at 8:00 AM. Review displayed “All available technicians.”', styles['BodyQA']),
          Paragraph('<b>Blocked:</b> Submit showed “No Qualified Technicians.” The candidate lookup at the app-configured Cloud Functions URL returned HTTP 404 when checked without credentials. This indicates the endpoint is missing or the app is pointed at the wrong deployment; technician availability could not be confirmed. No appointment/service request was created.', styles['BodyQA']),
          Spacer(1, 5*mm)]
notes = Table([[Paragraph('<b>Data note</b><br/>The test animal was saved in the app’s live Firebase project and remains in the farmer account as one Pig / Duroc record. No service request was written.', styles['BodyQA'])]], colWidths=[PAGE_W-36*mm])
notes.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),0.6,BORDER),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
story += [notes, Spacer(1, 7*mm), Paragraph('Test sequence', styles['H2Green']),
          Paragraph('Add Animal > select Pig > select Duroc > save > choose that record > review global Vaccination request > submit blocked.', styles['BodyQA']), PageBreak()]

story += [Paragraph('1. Animal type and breed selection', styles['H2Green']), Paragraph('Type choices and the Pig-specific breed list were shown in the Add Animal form.', styles['Sub']),
          screenshot_pair(shots['type'], 'Add Animal type dropdown shows the five catalog types.', shots['breeds'], 'Pig selection filters the breed dropdown to Pig breeds.'), PageBreak()]
story += [Paragraph('2. Saved animal and request linkage', styles['H2Green']), Paragraph('The app confirmed record creation and displayed the saved record as a selectable animal in Request Service.', styles['Sub']),
          screenshot_pair(shots['saved'], 'Animal registered successfully; the Pig / Duroc card is visible behind the confirmation.', shots['request_animal'], 'Request Service displays the matching saved record, Duroc breed, and quantity 1.'), PageBreak()]
story += [Paragraph('3. Global review and submission result', styles['H2Green']), Paragraph('The review was configured for all available technicians. The app prevented submission because it could not find an eligible technician.', styles['Sub']),
          screenshot_pair(shots['review'], 'Review shows “All available technicians” for the global request.', shots['blocked'], 'Submission stopped with “No Qualified Technicians”; no request was created.')]

doc = SimpleDocTemplate(str(out), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=19*mm, bottomMargin=22*mm, title='AgriCare USB Animal and Global Request QA Report', author='AgriCare QA')
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(out)
