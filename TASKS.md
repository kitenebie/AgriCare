# ✅ TASKS.md — AgriCare (Updated: 2026-08-07)

## Completed
- [x] Reset Expo template, build hierarchical structure
- [x] Created 6 pages (Login, Home, Map, Services, Messages, Profile)
- [x] Component library (Avatar, Badge, Button, Card, Icon)
- [x] Animation hooks (fadeInUp, fadeIn, scaleIn, slideInRight)
- [x] Theme system + TypeScript types + mock data
- [x] Replaced emoji with lucide-react-native icons
- [x] MapLibre + OSM tiles (free, no key)
- [x] Login image: full-width + fade-in animation
- [x] All pages wrapped in ScrollView
- [x] SafeAreaProvider added to root layout
- [x] Firebase integration (Auth, Firestore, RTDB, Storage, FCM)
- [x] Firebase service layer (6 service files)
- [x] Mock data seeder with dev button in Profile
- [x] Services page redesigned to match prototype (green header, icon grid, minimal selects)
- [x] Replaced old asset images with agri-care-logo.png
- [x] Created REQUIREMENTS.md — MoSCoW prioritization baseline (Admin/Farmer/Technician modules)
- [x] Role-based app architecture: (admin), (farmer), (technician) route groups
- [x] Auth flow with role selection screen
- [x] Admin module: 6 tabs (Dashboard, Users, Technicians, Appointments, Content, Settings)
- [x] Farmer module: 5 tabs (placeholder screens, layout ready)
- [x] Technician module: 5 tabs (placeholder screens, layout ready)
- [x] Comprehensive seedDatabase.ts — 14 collections covering all REQUIREMENTS.md features
- [x] Floating seed button (FAB) on Login screen — orange circle, bottom-right
- [x] seedAll() now: deletes all existing data → creates Firebase Auth accounts → seeds Firestore/RTDB
- [x] Migrated all Firebase services from deprecated namespaced API to modular API (v22-ready)
- [x] Login & Registration pages connected to Firebase Auth (role-based routing after login)
- [x] Moved all (tabs) pages to (farmer) directory, removed (tabs) entirely
- [x] Admin Home redesigned to GCash-style layout (green header with stats, 4-col icon grid, activity feed, banner)
- [x] Auto-login via AsyncStorage — saves session after login/register, auto-redirects on app open
- [x] Created GANTT.md + interactive Highcharts Gantt chart for all 42 tasks across 3 modules
- [x] Admin Home v2 — matched prototype: green header with leaf decor, individual stat cards (colored bg), circular colored icons on green card, activity feed, system status bar
- [x] Admin Livestock Categories — full CRUD UI: list with type badges/breed counts, add/edit modal form (name, type selector, breeds), delete with confirmation
- [x] Livestock Categories now reads/writes from Firebase Firestore (real-time listener, add, edit, delete — no mock data)
- [x] Forum page: real-time Firestore data (no mock fallback), edit/delete for own replies (or admin), inline edit UI with save/cancel
- [x] Admin Appointments page: view-only with Firestore real-time data, search, status filters, stats summary, detail modal (no mock fallback)
- [x] Livestock preview form page — modal screen with live preview card, form (name, type radio, breeds, description), saves to Firestore
- [x] Livestock list items now navigate to preview page on tap — shows editable form with live preview, supports edit + delete from preview screen
- [x] Activity Logs page (`(admin)/home/logs.tsx`) — view logs from Firestore `logs` collection, search, filter by type (Auth/CRUD/System/Error), relative timestamps
- [x] Activity logging on ALL pages with save/update/delete: livestock (x2), announcements, knowledge-base, reports, users, forum, auth (24 total log calls across 9 files)
- [x] Restructured DB: users/ + admin/ + farmer/ + technician/ with userId FK linking
- [x] Admin restructured: 4 tabs (Home, Forum, Livestock, Profile) + 8 quick-access pages from Home
- [x] .npmrc for legacy-peer-deps
- [x] Login & Registration pages connected to Firebase Auth (email/password sign-in, role-based redirect)
- [x] Auto-login via AsyncStorage session persistence
- [x] Database restructured to role-based collections (users/ + admin/ + farmer/ + technician/ with userId FK)

## Pending

### Admin Module
- [ ] Wire Dashboard stats to live Firestore data
- [ ] User Management CRUD (list, edit status, delete users)
- [ ] Technician Verification flow (approve/reject from admin panel)
- [ ] Knowledge Base CRUD (admin)
- [ ] Community Forum Moderation tools
- [ ] Reports & Complaints handling
- [ ] Ratings/Reviews Management
- [ ] Announcements Management
- [ ] Analytics Dashboard (SHOULD HAVE — post-MVP if no time)

### Shared/Infrastructure
- [ ] Real-time chat UI connected to chatService
- [ ] Image picker + upload to Storage
- [ ] FCM token registration on app start
- [ ] Pull-to-refresh, loading skeletons

### Farmer Module
- [ ] Livestock Profile Management (CRUD)
- [ ] Technician Profile detail page
- [ ] Appointment Booking (connected to Firestore)
- [ ] Appointment History view
- [ ] Emergency Assistance Request
- [ ] Knowledge Base reader
- [ ] Community Forum
- [ ] Rate & Review Technician
- [ ] Notification System (wired to UI)

### Technician Module
- [ ] Profile Management
- [ ] Availability Toggle
- [ ] Receive Appointment Requests
- [ ] Accept/Reject Appointment
- [ ] Consultation Chat
- [ ] View Farmer Information
- [ ] Appointment Schedule
- [ ] Respond to Emergency Requests
- [ ] Knowledge Sharing
- [ ] Community Forum Participation
- [ ] View Ratings & Reviews
