# Graph Report - AgriCare  (2026-10-16)

## Corpus Check
- 179 files · ~471,034 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 9)

## Summary
- 1111 nodes · 2856 edges · 79 communities (74 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `019dac02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Icon
- ModalAlert.tsx
- ChatScreen.tsx
- react-native
- dependencies
- (farmer)/map/index.tsx
- expo-router
- CHANGELOG.md
- expo
- react
- seedDatabase.ts
- ForumScreen.tsx
- 📌 REQUIREMENTS.md — AgriCare (MoSCoW Prioritization)
- theme.ts
- package.json
- functions/package.json
- mockData.ts
- ui/index.ts
- firestoreService.ts
- 📋 Collection Summary
- 🧭 DECISIONS.md — AgriCare
- appointments/index.tsx
- logCrud
- app/_layout.tsx
- AnnouncementsScreen.tsx
- firebase.ts
- seedCollection
- 🔧 TROUBLESHOOTING.md — AgriCare
- soundService.ts
- 📚 KNOWLEDGE.md — AgriCare
- BorderRadius
- 📊 GANTT.md — AgriCare Development Timeline
- 🤝 HANDOFF.md — AgriCare
- health-records/index.tsx
- AppointmentCard.tsx
- 📊 AgriCare — System Flowchart
- services/index.tsx
- (admin)/home/index.tsx
- 📱 AgriCare — Task Progress (Non-Technical Summary)
- Entity Relationship (Foreign Keys)
- 🔄 AgriCare — Sequence Diagrams
- 🐄 AgriCare - Livestock Support & Service Management
- 🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026)
- FontSize
- compilerOptions
- storageService.ts
- KnowledgeBaseScreen.tsx
- (farmer)/home/index.tsx
- showChatToast
- Use Case Table Summary
- @react-native-firebase/firestore
- dashboard/index.tsx
- 🎨 STYLEGUIDE.md — AgriCare
- (admin)/home/appointments.tsx
- consultations.tsx
- KnowledgeBaseViewScreen.tsx
- message-reports.tsx
- health-records.tsx
- form.tsx
- AGENTS.md
- 🤝 CONTRIBUTING.md — AgriCare
- 🚀 DEPLOYMENT.md — AgriCare
- HEALTH_RECORDS.md
- scripts
- custom-service.tsx
- ToastNotification.tsx
- 🏗️ ARCHITECTURE.md — AgriCare
- 📋 PROJECT.md — AgriCare
- Ponytail
- useFadeInUp
- DatePickerModal.tsx
- TESTING.md
- 📐 AgriCare — Class Diagram
- 🗄️ AgriCare — Entity Relationship Diagram
- 🤖 PROMPTS.md — AgriCare
- send-push/index.ts
- devDependencies
- config.ts

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 116 edges
2. `react` - 73 edges
3. `react-native` - 71 edges
4. `expo-router` - 68 edges
5. `Colors` - 66 edges
6. `modalAlert()` - 63 edges
7. `getSession()` - 61 edges
8. `FontSize` - 60 edges
9. `BorderRadius` - 59 edges
10. `Spacing` - 58 edges

## Surprising Connections (you probably didn't know these)
- `Ban System` --references--> `BanGuard()`  [INFERRED]
  HANDOFF.md → src/components/BanGuard.tsx
- `Alerts & Notifications` --references--> `modalAlert()`  [INFERRED]
  STYLEGUIDE.md → src/components/ui/ModalAlert.tsx
- `Changed` --references--> `signUp()`  [INFERRED]
  CHANGELOG.md → src/services/authService.ts
- `Authentication (Firebase Auth)` --references--> `signOut()`  [INFERRED]
  API.md → src/services/authService.ts
- `Completed` --references--> `uploadImageToSupabase()`  [INFERRED]
  TASKS.md → src/services/storage.ts

## Import Cycles
- None detected.

## Communities (79 total, 5 thin omitted)

### Community 0 - "Icon"
Cohesion: 0.11
Nodes (45): expo-local-authentication, @react-native-async-storage/async-storage, @react-native-firebase/auth, LivestockCategoriesPage(), MessageReportsPage(), ReportsPage(), AdminProfileScreen(), styles (+37 more)

### Community 1 - "ModalAlert.tsx"
Cohesion: 0.06
Nodes (45): [5.0.0] - 2026-08-09, Changed, Fixed, base64-arraybuffer, expo-camera, expo-image-picker, react-native-webview, FOCUS_TYPE_OPTIONS (+37 more)

### Community 2 - "ChatScreen.tsx"
Cohesion: 0.09
Nodes (38): MessageTab, Notification, styles, MessageTab, Notification, styles, UserInfo, ChatScreen() (+30 more)

### Community 3 - "react-native"
Cohesion: 0.09
Nodes (38): Added, Added, expo-image, react-native, react-native-safe-area-context, AdminLayout(), styles, TabIcon() (+30 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, base64-arraybuffer, expo, expo-audio, expo-calendar, expo-camera, expo-constants, expo-font (+33 more)

### Community 5 - "(farmer)/map/index.tsx"
Cohesion: 0.09
Nodes (34): @maplibre/maplibre-react-native, @supabase/supabase-js, DEFAULT_LOCATION, EMPTY_MAP_STYLE, FarmerMapScreen(), hasValidCoordinates(), OSM_FALLBACK, s (+26 more)

### Community 7 - "CHANGELOG.md"
Cohesion: 0.07
Nodes (29): [2.2.0] - 2026-08-02, [3.0.0] - 2026-08-02, [3.1.0] - 2026-08-03, [4.0.0] - 2026-08-08, [5.0.1] - 2026-08-09 (Morning), [5.0.1] - 2026-08-09 (Sun), [5.0.2] - 2026-08-09 (Afternoon), [5.1.0] - 2026-08-09 (Eve) (+21 more)

### Community 8 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, googleServicesFile, package, permissions (+19 more)

### Community 9 - "react"
Cohesion: 0.15
Nodes (16): react, FarmerLayout(), styles, TabIcon(), TabIconProps, styles, TabIcon(), TabIconProps (+8 more)

### Community 10 - "seedDatabase.ts"
Cohesion: 0.09
Nodes (22): @react-native-firebase/database, rtdb, getUserPin(), mockAdmins, mockAnimals, mockAnnouncements, mockAppointments, mockChats (+14 more)

### Community 11 - "ForumScreen.tsx"
Cohesion: 0.17
Nodes (14): CATEGORIES, ForumScreen(), Post, Reply, s, ForumViewScreen(), Post, Reply (+6 more)

### Community 12 - "📌 REQUIREMENTS.md — AgriCare (MoSCoW Prioritization)"
Cohesion: 0.09
Nodes (21): 👨‍💼 ADMIN MODULE, Admin Module — MUST HAVE, 🟩 COULD HAVE, 🟩 COULD HAVE, 🟩 COULD HAVE, 👨‍🌾 FARMER MODULE, Farmer Module — MUST HAVE, Implementation Status Tracker (+13 more)

### Community 13 - "theme.ts"
Cohesion: 0.13
Nodes (15): LogEntry, LogsPage(), sampleLogs, styles, typeConfig, Appointment, s, STATUS_CONFIG (+7 more)

### Community 14 - "package.json"
Cohesion: 0.10
Nodes (20): main, name, private, version, expo, expo-font, expo-linking, expo-splash-screen (+12 more)

### Community 15 - "functions/package.json"
Cohesion: 0.11
Nodes (18): { getFirestore }, { getMessaging }, { initializeApp }, { onDocumentCreated }, processPushQueue(), dependencies, firebase-admin, firebase-functions (+10 more)

### Community 16 - "mockData.ts"
Cohesion: 0.14
Nodes (17): AppointmentCardProps, MessageCardProps, TechnicianCardProps, MapViewProps, appointments, farmOverview, messages, notifications (+9 more)

### Community 17 - "ui/index.ts"
Cohesion: 0.16
Nodes (13): lucide-react-native, react-native-svg, AnnouncementMegaphone(), AnnouncementMegaphoneProps, iconMap, IconProps, LeafDecor(), LeafDecorProps (+5 more)

### Community 19 - "📋 Collection Summary"
Cohesion: 0.12
Nodes (15): 📋 Collection Summary, 💬 Communication, 🔐 Core (Role-Based), 🗺️ Data Flow, 🗄️ DATABASE.md — AgriCare Database Diagram, 📊 Entity Relationship Diagram, 📂 Firebase Config, 🐄 Livestock (+7 more)

### Community 20 - "🧭 DECISIONS.md — AgriCare"
Cohesion: 0.12
Nodes (15): ADR-001: Expo Router — file-based routing, ADR-002: MapLibre GL + OSM tiles (free, no API key), ADR-003: React Native Reanimated for all animations, ADR-004: Hierarchical folder architecture, ADR-005: expo-image over RN Image, ADR-006: Firebase as backend (Auth, Firestore, RTDB, Storage, FCM), ADR-007: Theme token system (no hardcoded values), ADR-008: lucide-react-native for icons (replaces custom SVG + emoji) (+7 more)

### Community 21 - "appointments/index.tsx"
Cohesion: 0.23
Nodes (13): expo-calendar, Appointment, s, TechAppointmentsScreen(), acceptAppointment(), AcceptParams, declineAppointment(), formatDateForMessage() (+5 more)

### Community 22 - "logCrud"
Cohesion: 0.18
Nodes (13): { height: SCREEN_HEIGHT }, s, User, UsersPage(), LivestockPreviewForm(), styles, typeOptions, logActivity() (+5 more)

### Community 23 - "app/_layout.tsx"
Cohesion: 0.20
Nodes (13): [5.3.0] - 2026-08-14 (Fri), Added, Changed, expo-constants, @react-native-firebase/messaging, react-native-gesture-handler, RootLayout(), styles (+5 more)

### Community 24 - "AnnouncementsScreen.tsx"
Cohesion: 0.21
Nodes (10): AdminAnnouncementsPage(), FarmerAnnouncementsPage(), TechAnnouncementsPage(), Announcement, AnnouncementsScreen(), AUDIENCES, PRIORITIES, Props (+2 more)

### Community 25 - "firebase.ts"
Cohesion: 0.23
Nodes (10): FORUM_BAN_CATEGORIES, ForumBanCategory, Report, styles, app, authInstance, Collections, RealtimeDB (+2 more)

### Community 26 - "seedCollection"
Cohesion: 0.14
Nodes (14): seedAdmins(), seedAnimals(), seedAppointments(), seedCollection(), seedConsultations(), seedEmergencyRequests(), seedFarmers(), seedForumPosts() (+6 more)

### Community 27 - "🔧 TROUBLESHOOTING.md — AgriCare"
Cohesion: 0.14
Nodes (13): `@/../../assets` path error, expo-image-picker plugin crash on startup, expo-location build failure, FCM push notifications not received on device, Firebase not connecting, Gradle build failure, INSTALL_FAILED_VERSION_DOWNGRADE, Map shows no tiles (+5 more)

### Community 28 - "soundService.ts"
Cohesion: 0.19
Nodes (8): expo-audio, ensureAudioMode(), playNewChatSound(), playNotificationSound(), playWithPlayer(), SOUND_NEW_CHAT, SOUND_NOTIFICATION, SOUND_TYPING

### Community 29 - "📚 KNOWLEDGE.md — AgriCare"
Cohesion: 0.15
Nodes (12): Auth Flow, Domain, External Services, Firebase Project, Geographic Context, 📚 KNOWLEDGE.md — AgriCare, Permission Model (KB & Forum), Push Notifications (+4 more)

### Community 30 - "BorderRadius"
Cohesion: 0.18
Nodes (10): RolesScreen(), styles, AuthIndexScreen(), styles, HOURS, MINUTES, s, TimePickerModalProps (+2 more)

### Community 31 - "📊 GANTT.md — AgriCare Development Timeline"
Cohesion: 0.17
Nodes (11): Admin Module, ✅ COMPLETED (Aug 1-7, 2026), Farmer Module (UI Only — not wired to Firebase), 📊 GANTT.md — AgriCare Development Timeline, 🔲 PENDING — Sprint Plan (Aug 7-23), Shared, Summary, Timeline Overview (+3 more)

### Community 32 - "🤝 HANDOFF.md — AgriCare"
Cohesion: 0.17
Nodes (11): Architecture, Ban System, Current State, 🤝 HANDOFF.md — AgriCare, Key Patterns, Key Services, New Files (Aug 14 session), New Files (Aug 8 session) (+3 more)

### Community 33 - "health-records/index.tsx"
Cohesion: 0.23
Nodes (8): react-native-reanimated, AppointmentAnimal, HealthRecord, s, TYPE_COLORS, styles, TechnicianCard(), useSlideInRight()

### Community 34 - "AppointmentCard.tsx"
Cohesion: 0.23
Nodes (8): AppointmentCard(), serviceIconMap, styles, AvatarProps, styles, getAvatarColor(), getInitials(), getStatusColor()

### Community 35 - "📊 AgriCare — System Flowchart"
Cohesion: 0.18
Nodes (10): 1. Registration & Authentication Flow, 2. Admin Verification Flow, 3. Appointment Booking Flow (Farmer), 4. Emergency Request Flow, 5. Health Record & Follow-up Flow, 6. Chat & Messaging Flow, 7. Rating & Review Flow, 8. Community Forum Flow (+2 more)

### Community 36 - "services/index.tsx"
Cohesion: 0.20
Nodes (10): expo-location, Animal, CustomService, s, ServiceItem, serviceTypes, Technician, DatePickerModal() (+2 more)

### Community 37 - "(admin)/home/index.tsx"
Cohesion: 0.27
Nodes (10): ActivityItem, AdminHome(), getRelativeTime(), quickAccess, QuickAccessItem, styles, { width }, IconName (+2 more)

### Community 38 - "📱 AgriCare — Task Progress (Non-Technical Summary)"
Cohesion: 0.18
Nodes (10): 👤 Account & Security, 🧑‍💼 Admin Features, 📱 AgriCare — Task Progress (Non-Technical Summary), 🟢 BAGONG TAPOS (Aug 9–15), 🧑‍🌾 Farmer Features, 🔴 HINDI PA TAPOS (Minor Items Only), 📊 Progress Summary, 🟢 TAPOS NA (Completed Features) (+2 more)

### Community 39 - "Entity Relationship (Foreign Keys)"
Cohesion: 0.20
Nodes (9): 📡 API.md — AgriCare, Authentication (Firebase Auth), Backend: Firebase, Collections, Entity Relationship (Foreign Keys), Firestore Collections, Map Tiles, Realtime Database Paths (Chat) (+1 more)

### Community 40 - "🔄 AgriCare — Sequence Diagrams"
Cohesion: 0.20
Nodes (9): 1. Registration & Verification Sequence, 2. Appointment Booking Sequence, 3. Real-time Chat Sequence, 4. Emergency Request Sequence, 5. Health Record & Follow-up Sequence, 6. Rating & Review Sequence, 7. Admin Moderation Sequence, 8. Knowledge Base & Forum Sequence (+1 more)

### Community 41 - "🐄 AgriCare - Livestock Support & Service Management"
Cohesion: 0.20
Nodes (9): 🐄 AgriCare - Livestock Support & Service Management, 🏗️ Architecture (Hierarchical), 🔥 Firebase Integration, 🚀 Getting Started, 🎨 Icons, 📦 Key Dependencies, 🗺️ MapLibre + OpenStreetMap, 📱 Screens (6 Pages) (+1 more)

### Community 42 - "🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026)"
Cohesion: 0.20
Nodes (9): 🎯 Daily Velocity Target, ⚡ Priority Rules, ⚠️ Risks & Mitigations, 📌 Scope Control, 🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026), 📅 Sprint Schedule, WEEK 2 Remainder: Aug 7 (Fri) → Aug 9 (Sun) — "Foundation Finish", WEEK 3: Aug 10 (Mon) → Aug 16 (Sat) — "Core Features" (+1 more)

### Community 43 - "FontSize"
Cohesion: 0.22
Nodes (8): Category, s, TYPES, AnimatedTouchable, Button(), ButtonProps, styles, FontSize

### Community 44 - "compilerOptions"
Cohesion: 0.22
Nodes (8): expo/tsconfig.base, compilerOptions, baseUrl, ignoreDeprecations, paths, strict, extends, include

### Community 45 - "storageService.ts"
Cohesion: 0.31
Nodes (6): @react-native-firebase/storage, storage, uploadAnimalImage(), uploadChatImage(), uploadImage(), uploadProfileImage()

### Community 46 - "KnowledgeBaseScreen.tsx"
Cohesion: 0.33
Nodes (5): Article, CATEGORIES, KnowledgeBaseScreen(), s, getCurrentUserProfile()

### Community 47 - "(farmer)/home/index.tsx"
Cohesion: 0.31
Nodes (8): FarmData, HomeScreen(), OverviewItem(), OverviewItemProps, QuickAccessItem(), QuickAccessItemProps, styles, Card()

### Community 48 - "showChatToast"
Cohesion: 0.22
Nodes (8): showChatToast(), In-App Chat Notifications (Toast), Completed, Completed (Aug 14 — UX Polish), Completed (Aug 15 — Keyboard UX), Completed (Post-Audit Aug 9 Eve), Pending, ✅ TASKS.md — AgriCare (Updated: 2026-08-15)

### Community 49 - "Use Case Table Summary"
Cohesion: 0.25
Nodes (7): 👨‍💼 Admin (15 Use Cases), 🎯 AgriCare — Use Case Diagram, Complete Use Case Diagram, 🧑‍🌾 Farmer (16 Use Cases), ⚙️ System Automated (8 Use Cases), 👨‍⚕️ Technician (14 Use Cases), Use Case Table Summary

### Community 50 - "@react-native-firebase/firestore"
Cohesion: 0.29
Nodes (7): @react-native-firebase/firestore, AdminRatingsReviewsScreen(), INITIAL_MOCK_REVIEWS, RATING_FILTERS, ReviewRecord, safeStr(), styles

### Community 51 - "dashboard/index.tsx"
Cohesion: 0.32
Nodes (7): DashboardData, OverviewItem(), OverviewItemProps, QuickAccessItem(), QuickAccessItemProps, styles, TechDashboardScreen()

### Community 52 - "🎨 STYLEGUIDE.md — AgriCare"
Cohesion: 0.25
Nodes (7): Alerts & Notifications, Component Rules, Design Tokens, Icons, Naming, Provider Setup (_layout.tsx), 🎨 STYLEGUIDE.md — AgriCare

### Community 53 - "(admin)/home/appointments.tsx"
Cohesion: 0.33
Nodes (6): AdminAppointmentsScreen(), AppointmentRecord, INITIAL_MOCK_APPOINTMENTS, safeStr(), STATUS_FILTERS, styles

### Community 54 - "consultations.tsx"
Cohesion: 0.33
Nodes (6): AdminConsultationsScreen(), ConsultationRecord, INITIAL_MOCK_CONSULTATIONS, safeStr(), STATUS_FILTERS, styles

### Community 55 - "KnowledgeBaseViewScreen.tsx"
Cohesion: 0.43
Nodes (3): Article, KnowledgeBaseViewScreen(), s

### Community 56 - "message-reports.tsx"
Cohesion: 0.29
Nodes (6): CHAT_BAN_CATEGORIES, ChatBanCategory, ChatBanOption, ChatReport, s, STATUS_COLORS

### Community 57 - "health-records.tsx"
Cohesion: 0.33
Nodes (6): FarmerHealthRecordsPage(), HealthRecord, s, STATUS_COLORS, TYPE_CONFIG, useFadeIn()

### Community 58 - "form.tsx"
Cohesion: 0.29
Nodes (6): FOLLOW_UP_TYPES, RECORD_TYPES, s, STATUS_OPTIONS, SYMPTOM_OPTIONS, VACCINE_TYPES

### Community 59 - "AGENTS.md"
Cohesion: 0.33
Nodes (5): Before you write, Expo HAS CHANGED, Ponytail, lazy senior dev mode, Ponytail: lean project work, The smallest complete change

### Community 60 - "🤝 CONTRIBUTING.md — AgriCare"
Cohesion: 0.33
Nodes (5): Code Rules, 🤝 CONTRIBUTING.md — AgriCare, Firebase Setup, Seed Mock Data, Setup

### Community 61 - "🚀 DEPLOYMENT.md — AgriCare"
Cohesion: 0.33
Nodes (5): Build, 🚀 DEPLOYMENT.md — AgriCare, Dev Setup, Firebase Config, .npmrc

### Community 62 - "HEALTH_RECORDS.md"
Cohesion: 0.33
Nodes (5): Calendar Reminder Workflow, Firestore Collection: `healthReminders`, Health Calendar Reminder, Health Records Data Fields, Per Animal Health Record (Firestore Collection: `healthRecords`)

### Community 63 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, android, ios, lint, start, web

### Community 64 - "custom-service.tsx"
Cohesion: 0.33
Nodes (5): COL_W, DEFAULT_SUGGESTIONS, MED_ICONS, s, SUGGESTIONS

### Community 65 - "ToastNotification.tsx"
Cohesion: 0.33
Nodes (5): dismissChatToast(), styles, ToastConfig, ToastState, { width: SCREEN_WIDTH }

### Community 66 - "🏗️ ARCHITECTURE.md — AgriCare"
Cohesion: 0.40
Nodes (4): 🏗️ ARCHITECTURE.md — AgriCare, Data Flow, Folder Structure, System Architecture

### Community 67 - "📋 PROJECT.md — AgriCare"
Cohesion: 0.40
Nodes (4): Overview, 📋 PROJECT.md — AgriCare, Status, Tech Stack

### Community 68 - "Ponytail"
Cohesion: 0.40
Nodes (4): Before you write, Levels, Ponytail, The smallest complete change

### Community 69 - "useFadeInUp"
Cohesion: 0.60
Nodes (4): MessageCard(), styles, Badge(), useFadeInUp()

### Community 70 - "DatePickerModal.tsx"
Cohesion: 0.40
Nodes (4): DatePickerModalProps, DAYS, MONTHS, s

### Community 71 - "TESTING.md"
Cohesion: 0.40
Nodes (4): Current: Manual testing via Expo on physical device (USB debugging), Manual Test Cases, Seed data: Profile → "🌱 Seed Database (Dev)" button, Test Accounts (created by seeder)

### Community 72 - "📐 AgriCare — Class Diagram"
Cohesion: 0.50
Nodes (3): 📐 AgriCare — Class Diagram, Complete Class Diagram, Service Layer Classes

### Community 73 - "🗄️ AgriCare — Entity Relationship Diagram"
Cohesion: 0.50
Nodes (3): 🗄️ AgriCare — Entity Relationship Diagram, Complete ER Diagram, Storage Schema (Supabase + Firebase Storage)

### Community 74 - "🤖 PROMPTS.md — AgriCare"
Cohesion: 0.50
Nodes (3): AI Rules, 🤖 PROMPTS.md — AgriCare, When Adding a Firebase Feature

### Community 76 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

## Knowledge Gaps
- **17 isolated node(s):** `@expo/vector-icons`, `@fortawesome/fontawesome-svg-core`, `@react-native-firebase/app`, `expo`, `expo-font` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 598 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@react-native-firebase/firestore` connect `@react-native-firebase/firestore` to `Icon`, `ModalAlert.tsx`, `ChatScreen.tsx`, `react-native`, `(farmer)/map/index.tsx`, `react`, `seedDatabase.ts`, `ForumScreen.tsx`, `theme.ts`, `package.json`, `firestoreService.ts`, `appointments/index.tsx`, `logCrud`, `app/_layout.tsx`, `AnnouncementsScreen.tsx`, `firebase.ts`, `health-records/index.tsx`, `services/index.tsx`, `(admin)/home/index.tsx`, `FontSize`, `KnowledgeBaseScreen.tsx`, `(farmer)/home/index.tsx`, `dashboard/index.tsx`, `(admin)/home/appointments.tsx`, `consultations.tsx`, `KnowledgeBaseViewScreen.tsx`, `message-reports.tsx`, `health-records.tsx`, `form.tsx`, `custom-service.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `@expo/vector-icons`, `@fortawesome/fontawesome-svg-core`, `@react-native-firebase/app` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Icon` be split into smaller, more focused modules?**
  _Cohesion score 0.11245791245791245 - nodes in this community are weakly interconnected._
- **Why does `expo-router` connect `expo-router` to `Icon`, `ModalAlert.tsx`, `ChatScreen.tsx`, `react-native`, `(farmer)/map/index.tsx`, `react`, `ForumScreen.tsx`, `theme.ts`, `package.json`, `logCrud`, `app/_layout.tsx`, `AnnouncementsScreen.tsx`, `firebase.ts`, `BorderRadius`, `health-records/index.tsx`, `services/index.tsx`, `(admin)/home/index.tsx`, `FontSize`, `KnowledgeBaseScreen.tsx`, `(farmer)/home/index.tsx`, `@react-native-firebase/firestore`, `dashboard/index.tsx`, `(admin)/home/appointments.tsx`, `consultations.tsx`, `KnowledgeBaseViewScreen.tsx`, `message-reports.tsx`, `health-records.tsx`, `form.tsx`, `custom-service.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `ModalAlert.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058069381598793365 - nodes in this community are weakly interconnected._
- **Why does `modalAlert()` connect `Icon` to `ModalAlert.tsx`, `ChatScreen.tsx`, `react-native`, `react`, `ForumScreen.tsx`, `ui/index.ts`, `appointments/index.tsx`, `logCrud`, `app/_layout.tsx`, `AnnouncementsScreen.tsx`, `firebase.ts`, `🤝 HANDOFF.md — AgriCare`, `services/index.tsx`, `FontSize`, `KnowledgeBaseScreen.tsx`, `showChatToast`, `🎨 STYLEGUIDE.md — AgriCare`, `message-reports.tsx`, `form.tsx`, `custom-service.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `ChatScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08687943262411348 - nodes in this community are weakly interconnected._