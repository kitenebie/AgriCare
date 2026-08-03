# 📌 REQUIREMENTS.md — AgriCare (MoSCoW Prioritization)

> This is the **baseline requirement document**. All development tasks reference this file.

## Priority Legend

| Priority | Description |
| --- | --- |
| **Must Have (M)** | Kritikal. Hindi magiging functional ang system kapag wala ito. |
| **Should Have (S)** | Mahalaga ngunit puwedeng maidagdag pagkatapos ng MVP. |
| **Could Have (C)** | Nice-to-have features na nagpapaganda ng user experience. |
| **Won't Have (W)** | Hindi muna isasama sa unang release. |

---

## 👨‍💼 ADMIN MODULE

### 🟥 MUST HAVE

- User Management (Farmers & Technicians)
- Verify Technician Accounts
- Approve/Reject Registration
- Manage Livestock Categories
- Manage Knowledge Base Articles
- View Appointment Records
- View Consultation Records
- Manage Community Forum
- Moderate Reports & Complaints
- Dashboard Statistics
- Manage Ratings & Reviews
- Manage Technician Availability Status
- Authentication & Role Management

---

### 🟨 SHOULD HAVE

- Analytics Dashboard
- Generate Reports
- SMS/Email Notification Management
- Audit Logs
- Announcement Management

---

### 🟩 COULD HAVE

- Heatmap of Farmer Requests
- Technician Performance Ranking
- Barangay Statistics
- Export Reports (PDF/Excel)

---

### ⬜ WON'T HAVE (Version 1)

- AI Disease Diagnosis
- IoT Integration
- Livestock Sensor Monitoring
- Drone Monitoring
- Blockchain Records

---

## 👨‍🌾 FARMER MODULE

### 🟥 MUST HAVE

- Registration/Login
- Farmer Profile
- Livestock Profile Management
- Search Nearby Technicians
- Technician Profile Viewing
- Appointment Booking
- Consultation Request
- Chat with Technician
- Emergency Assistance Request
- Knowledge Base
- Community Forum
- Rate & Review Technician
- Appointment History
- Notification System

> Ito ang mga pangunahing functionality na direktang sumusuporta sa layunin ng pag-connect ng farmers sa technicians, pag-book ng appointment, consultation, at pagbibigay ng livestock management information.

---

### 🟨 SHOULD HAVE

- Favorite Technician
- Appointment Rescheduling
- Cancel Appointment
- Upload Animal Photos
- Livestock Health Records
- Search by Animal Type
- Filter Technician by Specialty

---

### 🟩 COULD HAVE

- Vaccination Reminder
- Calendar View
- Download Care Guides
- Share Forum Posts
- Dark Mode

---

### ⬜ WON'T HAVE

- AI Health Prediction
- Automatic Disease Detection
- Offline Mode
- GPS Animal Tracking
- Wearable Livestock Monitoring

---

## 👨‍⚕️ TECHNICIAN MODULE

### 🟥 MUST HAVE

- Registration/Login
- Profile Management
- Verification Status
- Availability Toggle
- Receive Appointment Requests
- Accept/Reject Appointment
- Consultation Chat
- View Farmer Information
- Appointment Schedule
- Respond to Emergency Requests
- Knowledge Sharing
- Community Forum Participation
- View Ratings & Reviews

> Ang technician availability, consultation, appointment management, at knowledge sharing ay kabilang sa mga pangunahing objectives ng system.

---

### 🟨 SHOULD HAVE

- Calendar Management
- Appointment History
- Consultation Notes
- Upload Educational Materials
- Notification Preferences

---

### 🟩 COULD HAVE

- Technician Badge
- Top Rated Technician
- Monthly Statistics
- Download Consultation Reports

---

### ⬜ WON'T HAVE

- AI Assistant
- Video Consultation
- Electronic Prescription
- Livestock Medical Imaging

---

## Implementation Status Tracker

### Farmer Module — MUST HAVE

| # | Feature | Status |
|---|---------|--------|
| 1 | Registration/Login | 🔲 UI done, Firebase Auth ready (not wired) |
| 2 | Farmer Profile | 🔲 UI done (Profile page) |
| 3 | Livestock Profile Management | 🔲 Firestore service ready |
| 4 | Search Nearby Technicians | 🔲 Map page + Firestore query ready |
| 5 | Technician Profile Viewing | 🔲 TechnicianCard done |
| 6 | Appointment Booking | 🔲 Services page UI done |
| 7 | Consultation Request | 🔲 Service request form done |
| 8 | Chat with Technician | 🔲 chatService.ts ready (RTDB) |
| 9 | Emergency Assistance Request | 🔲 Not started |
| 10 | Knowledge Base | 🔲 Not started |
| 11 | Community Forum | 🔲 Not started |
| 12 | Rate & Review Technician | 🔲 Firestore service ready |
| 13 | Appointment History | 🔲 Mock data + UI partial |
| 14 | Notification System | 🔲 FCM service ready (not wired) |

### Technician Module — MUST HAVE

| # | Feature | Status |
|---|---------|--------|
| 1 | Registration/Login | 🔲 Auth service ready |
| 2 | Profile Management | 🔲 Not started |
| 3 | Verification Status | 🔲 Not started |
| 4 | Availability Toggle | 🔲 Not started |
| 5 | Receive Appointment Requests | 🔲 Not started |
| 6 | Accept/Reject Appointment | 🔲 Not started |
| 7 | Consultation Chat | 🔲 chatService ready |
| 8 | View Farmer Information | 🔲 Not started |
| 9 | Appointment Schedule | 🔲 Not started |
| 10 | Respond to Emergency Requests | 🔲 Not started |
| 11 | Knowledge Sharing | 🔲 Not started |
| 12 | Community Forum Participation | 🔲 Not started |
| 13 | View Ratings & Reviews | 🔲 Firestore service ready |

### Admin Module — MUST HAVE

| # | Feature | Status |
|---|---------|--------|
| 1 | User Management | 🔲 Not started (needs admin panel) |
| 2 | Verify Technician Accounts | 🔲 Not started |
| 3 | Approve/Reject Registration | 🔲 Not started |
| 4 | Manage Livestock Categories | 🔲 Not started |
| 5 | Manage Knowledge Base Articles | 🔲 Not started |
| 6 | View Appointment Records | 🔲 Not started |
| 7 | View Consultation Records | 🔲 Not started |
| 8 | Manage Community Forum | 🔲 Not started |
| 9 | Moderate Reports & Complaints | 🔲 Not started |
| 10 | Dashboard Statistics | 🔲 Not started |
| 11 | Manage Ratings & Reviews | 🔲 Not started |
| 12 | Manage Technician Availability | 🔲 Not started |
| 13 | Authentication & Role Management | 🔲 Auth service has role field |
