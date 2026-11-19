from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

root = Path(r'C:\Users\kenne\Desktop\em-res\AgriCare')
out = root / 'output' / 'pdf' / 'AgriCare_v2.0.6_Offline_Technician_Request_Test.pdf'
out.parent.mkdir(parents=True, exist_ok=True)
W, H = A4
GREEN = colors.HexColor('#087F51')
DARK = colors.HexColor('#172238')
MUTED = colors.HexColor('#667085')
PALE = colors.HexColor('#E9F6EF')
BORDER = colors.HexColor('#DCE9E1')

c = canvas.Canvas(str(out), pagesize=A4)
c.setTitle('AgriCare v2.0.6 - Offline Technician Request Test')
c.setAuthor('AgriCare QA')

def header(page, label):
    c.setFillColor(GREEN)
    c.rect(0, H-12, W, 12, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(34, H-34, 'AGRICARE  /  CLIENT QA EVIDENCE')
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 9)
    c.drawRightString(W-34, H-34, 'VERSION 2.0.6')
    c.setStrokeColor(BORDER)
    c.line(34, H-44, W-34, H-44)
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 8)
    c.drawString(34, 22, label)
    c.drawRightString(W-34, 22, f'{page} / 4')

def paragraph(text, x, y, max_chars=80, leading=16, font='Helvetica', size=10, color=DARK):
    c.setFillColor(color)
    c.setFont(font, size)
    words = text.split()
    lines, line = [], ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if len(candidate) > max_chars and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    for row in lines:
        c.drawString(x, y, row)
        y -= leading
    return y

# Page 1: result summary
header(1, 'Manual Android test | November 14, 2026')
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 24)
c.drawString(34, 735, 'Offline technician')
c.drawString(34, 706, 'request test')
c.setFillColor(GREEN)
c.roundRect(W-116, 706, 82, 34, 17, fill=1, stroke=0)
c.setFillColor(colors.white)
c.setFont('Helvetica-Bold', 12)
c.drawCentredString(W-75, 718, 'PASS')
c.setFillColor(MUTED)
c.setFont('Helvetica', 11)
c.drawString(34, 681, 'Schedule-available technician remains selectable when heartbeat is offline.')

# Version and device card
c.setFillColor(PALE)
c.roundRect(34, 574, W-68, 83, 12, fill=1, stroke=0)
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 11)
c.drawString(50, 635, 'Test environment')
c.setFont('Helvetica', 10)
c.drawString(50, 613, 'Expo app config: 2.0.6    |    Android versionCode: 5')
c.drawString(50, 592, 'Android device connected by USB debugging; Farmer account session.')

c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 13)
c.drawString(34, 540, 'What was verified')
steps = [
    ('1', 'Farmer home showed 0 online technicians while Jelina remained in the availability directory.'),
    ('2', 'Jelina still appeared in Available Technicians with a scheduled Nov 16 time range.'),
    ('3', 'Farmer selected Jelina and Nov 16, 2026 at 11:30 AM; the form advanced to Review without an unavailable warning.'),
    ('4', 'Submitted a QA request. The app displayed the Success confirmation.'),
]
y = 511
for n, text in steps:
    c.setFillColor(GREEN)
    c.circle(45, y+3, 10, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(45, y, n)
    y = paragraph(text, 64, y, max_chars=78, leading=14, size=10)
    y -= 9

c.setFillColor(colors.HexColor('#FFF7E6'))
c.roundRect(34, 108, W-68, 97, 12, fill=1, stroke=0)
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 11)
c.drawString(50, 180, 'Result and scope')
y = paragraph('PASS: offline heartbeat did not block technician selection or service-request submission when the selected schedule was available.', 50, 158, max_chars=77, leading=14, size=10)
paragraph('The QA request remains pending for the technician. Technician acceptance while offline was not tested.', 50, y-2, max_chars=77, leading=14, size=10)
c.showPage()

# Page 2: online status and availability list
header(2, 'Evidence from the 2.0.6 retest | offline and available')
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 17)
c.drawString(34, H-76, 'Offline technician remained available to select')
c.setFillColor(MUTED)
c.setFont('Helvetica', 9)
c.drawString(34, H-94, 'Farmer home online count at left; Available Technicians directory at right.')
left = root / 'outputs' / 'qa-home-online-206.png'
right = root / 'outputs' / 'qa-available-206.png'
for path in (left, right):
    if not path.exists():
        raise FileNotFoundError(path)
img_w, img_h = 244, 542
c.drawImage(ImageReader(str(left)), 35, 167, width=img_w, height=img_h, preserveAspectRatio=True, anchor='c', mask='auto')
c.drawImage(ImageReader(str(right)), 316, 167, width=img_w, height=img_h, preserveAspectRatio=True, anchor='c', mask='auto')
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 9)
c.drawString(35, 149, 'Farmer home: 0 technicians online')
c.drawString(316, 149, 'Jelina Equiz listed with Nov 16 availability')
c.showPage()

# Page 3: selected technician and schedule review
header(3, 'Evidence from the 2.0.6 retest | selected technician and schedule')
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 17)
c.drawCentredString(W/2, H-75, 'Selected technician reached request review')
c.setFillColor(MUTED)
c.setFont('Helvetica', 9)
c.drawCentredString(W/2, H-93, 'Nov 16, 2026 at 11:30 AM - Jelina Equiz - no unavailable warning')
review = root / 'outputs' / 'qa-review-206.png'
if not review.exists():
    raise FileNotFoundError(review)
c.drawImage(ImageReader(str(review)), (W-315)/2, 38, width=315, height=690, preserveAspectRatio=True, anchor='c', mask='auto')
c.showPage()

# Page 4: successful submission
header(4, 'Evidence from the 2.0.6 retest | successful submission')
c.setFillColor(DARK)
c.setFont('Helvetica-Bold', 17)
c.drawCentredString(W/2, H-75, 'Service request submitted successfully')
c.setFillColor(MUTED)
c.setFont('Helvetica', 9)
c.drawCentredString(W/2, H-93, 'QA description: offline technician test; request left pending')
success = root / 'outputs' / 'qa-submit-success-206.png'
if not success.exists():
    raise FileNotFoundError(success)
c.drawImage(ImageReader(str(success)), (W-315)/2, 38, width=315, height=690, preserveAspectRatio=True, anchor='c', mask='auto')
c.save()
print(out)
