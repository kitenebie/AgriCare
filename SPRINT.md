# 🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026)

> **Generated**: 2026-08-07 | **Days Remaining**: 16 | **Tasks Remaining**: ~29 **Strategy**: Prioritize features that ALL roles share (chat, notifications), then complete each module's MUST-HAVEs

---

## ⚡ Priority Rules

1. **Shared infrastructure first** — features used by all 3 roles (chat, notifications, image upload)
2. **Admin module near-complete** — just wire remaining pages to Firestore
3. **Farmer module half-done** — UI exists, needs Firebase wiring
4. **Technician module from scratch** — but can reuse farmer patterns (chat, appointments)

---

## 📅 Sprint Schedule

### WEEK 2 Remainder: Aug 7 (Fri) → Aug 9 (Sun) — "Foundation Finish"

| Day | Tasks | Module |
| --- | --- | --- |
| **Aug 7 (Fri)** | Fix docs, sprint plan, wire remaining Admin dashboard stats to Firestore | Admin |
| **Aug 8 (Sat)** | User Management CRUD (list, edit status, delete) | Admin |
| **Aug 9 (Sun)** | Technician Verification flow (approve/reject), Knowledge Base CRUD | Admin |

**Goal**: Admin module 80% complete

---

### WEEK 3: Aug 10 (Mon) → Aug 16 (Sat) — "Core Features"

| Day | Tasks | Module |
| --- | --- | --- |
| **Aug 10 (Mon)** | Real-time Chat UI connected to chatService (RTDB) | Shared |
| **Aug 11 (Tue)** | Chat UI polish + image picker/upload (expo-image-picker → Firebase Storage) | Shared |
| **Aug 12 (Wed)** | Farmer: Livestock Profile CRUD + Technician Profile detail page | Farmer |
| **Aug 13 (Thu)** | Farmer: Appointment Booking (connected to Firestore) + History | Farmer |
| **Aug 14 (Fri)** | Farmer: Knowledge Base reader + Community Forum | Farmer |
| **Aug 15 (Sat)** | Farmer: Emergency Request + Rate/Review Technician | Farmer |
| **Aug 16 (Sun)** | FCM notifications wired (token registration, push delivery) | Shared |

**Goal**: Farmer module 100% MUST-HAVEs, Shared features done

---

### WEEK 4: Aug 17 (Mon) → Aug 23 (Sun) — "Technician Module + Polish"

| Day | Tasks | Module |
| --- | --- | --- |
| **Aug 17 (Mon)** | Technician: Profile Management + Availability Toggle | Technician |
| **Aug 18 (Tue)** | Technician: Receive/Accept/Reject Appointments | Technician |
| **Aug 19 (Wed)** | Technician: Appointment Schedule + View Farmer Info | Technician |
| **Aug 20 (Thu)** | Technician: Emergency Response + Consultation Chat (reuse shared) | Technician |
| **Aug 21 (Fri)** | Technician: Knowledge Sharing + Forum + Ratings view | Technician |
| **Aug 22 (Sat)** | Admin: Reports/Complaints + Announcements + Analytics polish | Admin |
| **Aug 23 (Sun)** | Full integration testing, bug fixes, final polish | ALL |

**Goal**: All 3 modules MUST-HAVEs complete = MVP ✅

---

## 🎯 Daily Velocity Target

- **~2 features/day** average needed
- Technician module benefits from copy-paste patterns from Farmer (chat, appointments, profile)
- Admin remaining tasks are mostly "wire existing UI to Firestore" (faster)

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Gradle/build errors | 🔴 High | Pre-build each morning, keep android/ clean |
| Chat implementation complex | 🟡 Med | chatService already exists, just need UI |
| Technician module from scratch | 🟡 Med | Reuse farmer patterns (80% similar) |
| FCM setup on device | 🟡 Med | Test on physical device early (Aug 16) |
| Time overrun | 🟡 Med | SHOULD-HAVEs deferred to post-MVP sprint |

---

## 📌 Scope Control

**IN for MVP (MUST HAVE only)**:

- All items marked 🟥 MUST HAVE in REQUIREMENTS.md
- Health Records (HEALTH_RECORDS.md) — defer to post-MVP unless time allows

**OUT for MVP (deferred)**:

- Analytics Dashboard (SHOULD HAVE)
- Export Reports
- SMS/Email Notification Management
- Vaccination Reminders, Calendar View
- Dark Mode
- All WON'T HAVE items

