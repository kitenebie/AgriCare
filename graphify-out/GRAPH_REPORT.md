# Graph Report - AgriCare  (2026-11-19)

## Corpus Check
- 325 files · ~4,086,893 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 265 file(s) not represented in the graph (top: (none) 204, .csv 53, .xml 3)

## Summary
- 3610 nodes · 6636 edges · 209 communities (179 shown, 30 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a29bad43`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FontScale.tsx
- firebase.ts
- appointmentService.ts
- (farmer)/map/index.tsx
- dependencies
- (farmer)/messages/index.tsx
- app/index.tsx
- CHANGELOG.md
- expo
- ui/index.ts
- seedDatabase.ts
- ShadcnInstaller
- 📌 REQUIREMENTS.md — AgriCare (MoSCoW Prioritization)
- react-native
- package.json
- index.js
- mockData.ts
- IdentityVerificationResult.tsx
- firestoreService.ts
- 📋 Collection Summary
- 🧭 DECISIONS.md — AgriCare
- test_design_system_mode.py
- authService.ts
- Icon
- TestSearchDomains
- scripts/core.py
- (farmer)/home/index.tsx
- 🔧 TROUBLESHOOTING.md — AgriCare
- soundService.ts
- 📚 KNOWLEDGE.md — AgriCare
- expo-router
- 📊 GANTT.md — AgriCare Development Timeline
- 🤝 HANDOFF.md — AgriCare
- gray
- Tailwind CSS Utility Reference
- 📊 AgriCare — System Flowchart
- schedule/index.tsx
- authService.ts
- 📱 AgriCare — Task Progress (Non-Technical Summary)
- Entity Relationship (Foreign Keys)
- 🔄 AgriCare — Sequence Diagrams
- 🐄 AgriCare - Livestock Support & Service Management
- 🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026)
- Common Rules for Professional UI
- compilerOptions
- storageService.ts
- Brand Guidelines v1.0
- Design
- showChatToast
- Use Case Table Summary
- 🎨 STYLEGUIDE.md — AgriCare
- seedCollection
- Canvas Design System
- Form & Input Components
- Tailwind CSS Responsive Design
- icon/generate.py
- validate_data.py
- Typography Specifications
- Logo Usage Rules
- AGENTS.md
- 🤝 CONTRIBUTING.md — AgriCare
- 🚀 DEPLOYMENT.md — AgriCare
- HEALTH_RECORDS.md
- scripts
- json
- Component Specifications
- 🏗️ ARCHITECTURE.md — AgriCare
- 📋 PROJECT.md — AgriCare
- Ponytail
- html-token-validator.py
- shadcn/ui Accessibility Patterns
- TESTING.md
- 📐 AgriCare — Class Diagram
- 🗄️ AgriCare — Entity Relationship Diagram
- 🤖 PROMPTS.md — AgriCare
- send-push/index.ts
- ui/index.ts
- config.ts
- design_system.py
- TestBm25CoreBehavior
- dashboard/index.tsx
- Asset Approval Checklist
- Logo AI Prompt Engineering
- DesignSystemGenerator
- csv
- TestDomainDetection
- Color Palette Management
- CIP Deliverable Guide
- States and Variants
- UI Styling Skill
- ChatScreen.tsx
- Workflow
- slide_search_core.py
- csv
- Design System
- Tailwind CSS Customization
- BM25
- generate-slide.py
- spacing
- Routing by Task Type
- json
- shadcn/ui Theming & Customization
- TestTailwindConfigGenerator
- Asset Organization Guide
- Primary Color Meanings
- Core Logo Types
- color
- TestThresholdGate
- Brand Consistency Checklist
- CIP Mockup Prompt Engineering
- Color Semantics
- Added
- (farmer)/home/appointments.tsx
- Design Principles
- Design Principles
- fontSize
- storage.ts
- extract-colors.cjs
- TestTokenizer
- CIP Design Reference
- Icon Design Reference
- Copywriting Formulas
- Copywriting Formulas
- CatalogRefreshTest
- TestFixtureValidation
- register.tsx
- [3.1.0] - 2026-08-03
- Banner Design - Multi-Format Creative Banner System
- Messaging Framework
- Brand Voice Framework
- validate-asset.cjs
- Layout Patterns
- Tailwind Integration
- radius
- Layout Patterns
- TestWebStackFreshness
- registration-email-otp/index.ts
- update.md
- Logo Design Reference
- locationService.ts
- Token Architecture
- design-tokens-starter.json
- .test_node_check_parses_generated_config
- Primitive Tokens
- embed-tokens.cjs
- validate-tokens.cjs
- card
- _style_is_dark_primary
- Core Visual Elements
- inject-brand-context.cjs
- CIP Design Style Guide
- Quick Reference
- sync-brand-to-tokens.cjs
- Brand
- Slide Strategies
- Component Tokens
- generate-tokens.cjs
- button
- duration
- Slide Strategies
- .test_full_configuration_typescript
- Cancellation flow QA report — 2026-11-14
- BM25
- input
- .validate_config
- ui-ux-pro-max
- Slides Reference
- HTML Slide Template
- logo/search.py
- HTML Slide Template
- Query Contract
- build-guide.mjs
- Slides
- Pre-Delivery Checklist
- Prerequisites
- Brand Guidelines Template
- $type
- radius
- lg
- sm
- Example Workflow
- Q: realtime ba naguupdate ang location ng mga users?
- Q: Dashboard: may paraan na para mag-post ng sick-animal report. paano ito?
- AgriCare ADB test checklist
- padding-y
- xl
- none
- Tips for Better Results
- 16
- 1
- 3
- 8
- destructive
- destructive-foreground
- muted
- primary-foreground
- ring
- secondary-foreground
- slides-create.md
- create.md
- AgriCare_Feature_Guide_5a887165.md

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 126 edges
2. `react` - 78 edges
3. `react-native` - 76 edges
4. `expo-router` - 69 edges
5. `Colors` - 68 edges
6. `AppText` - 66 edges
7. `modalAlert()` - 65 edges
8. `getSession()` - 63 edges
9. `FontSize` - 61 edges
10. `BorderRadius` - 61 edges

## Surprising Connections (you probably didn't know these)
- `Ban System` --references--> `BanGuard()`  [INFERRED]
  HANDOFF.md → src/components/BanGuard.tsx
- `Interaction (App)` --references--> `Button()`  [INFERRED]
  .agents/skills/ui-ux-pro-max/SKILL.md → src/components/ui/Button.tsx
- `Alerts & Notifications` --references--> `modalAlert()`  [INFERRED]
  STYLEGUIDE.md → src/components/ui/ModalAlert.tsx
- `In-App Chat Notifications (Toast)` --references--> `showChatToast()`  [INFERRED]
  STYLEGUIDE.md → src/components/ui/ToastNotification.tsx
- `Changed` --references--> `signUp()`  [INFERRED]
  CHANGELOG.md → src/services/authService.ts

## Import Cycles
- None detected.

## Communities (209 total, 30 thin omitted)

### Community 0 - "FontScale.tsx"
Cohesion: 0.08
Nodes (55): expo-local-authentication, @react-native-async-storage/async-storage, @react-native-firebase/auth, AdminProfileScreen(), styles, ApplicationReviewScreen(), styles, s (+47 more)

### Community 1 - "firebase.ts"
Cohesion: 0.06
Nodes (45): @react-native-firebase/firestore, AdminAnnouncementsPage(), Category, LivestockCategoriesPage(), s, TYPES, FarmerAnnouncementsPage(), TechAnnouncementsPage() (+37 more)

### Community 2 - "appointmentService.ts"
Cohesion: 0.12
Nodes (31): expo-calendar, dateKey(), isPastTimeOnDate(), ServicesScreen(), dateKey(), getMonthCells(), TechnicianAvailabilityPage(), firstFutureTime() (+23 more)

### Community 3 - "(farmer)/map/index.tsx"
Cohesion: 0.12
Nodes (31): @maplibre/maplibre-react-native, DEFAULT_LOCATION, EMPTY_MAP_STYLE, FarmerMapScreen(), getRequestStatus(), hasValidCoordinates(), MapTechnician, OSM_FALLBACK (+23 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, base64-arraybuffer, expo, expo-audio, expo-calendar, expo-camera, expo-constants, expo-file-system (+34 more)

### Community 5 - "(farmer)/messages/index.tsx"
Cohesion: 0.09
Nodes (34): react-native-reanimated, FarmerHealthRecordsPage(), HealthRecord, s, STATUS_COLORS, TYPE_CONFIG, MessagesScreen(), MessageTab (+26 more)

### Community 6 - "app/index.tsx"
Cohesion: 0.27
Nodes (8): @react-native-firebase/messaging, LoginScreen(), styles, PermissionStatus, requestAllPermissions(), authenticateWithBiometrics(), getRouteForRole(), isBiometricsEnabled()

### Community 7 - "CHANGELOG.md"
Cohesion: 0.07
Nodes (26): [2.2.0] - 2026-08-02, [3.0.0] - 2026-08-02, [4.0.0] - 2026-08-08, [5.0.1] - 2026-08-09 (Morning), [5.0.1] - 2026-08-09 (Sun), [5.0.2] - 2026-08-09 (Afternoon), [5.1.0] - 2026-08-09 (Eve), [5.2.0] - 2026-08-09 (Sun) (+18 more)

### Community 8 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, googleServicesFile, package, permissions, softwareKeyboardLayoutMode (+19 more)

### Community 9 - "ui/index.ts"
Cohesion: 0.08
Nodes (41): react, react-native-safe-area-context, react-native-svg, ActivityItem, adminCardBackgrounds, AdminHome(), getRelativeTime(), quickAccess (+33 more)

### Community 10 - "seedDatabase.ts"
Cohesion: 0.11
Nodes (19): getUserPin(), mockAdmins, mockAnimals, mockAnnouncements, mockAppointments, mockChats, mockConsultations, mockEmergencyRequests (+11 more)

### Community 11 - "ShadcnInstaller"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 12 - "📌 REQUIREMENTS.md — AgriCare (MoSCoW Prioritization)"
Cohesion: 0.09
Nodes (21): 👨‍💼 ADMIN MODULE, Admin Module — MUST HAVE, 🟩 COULD HAVE, 🟩 COULD HAVE, 🟩 COULD HAVE, 👨‍🌾 FARMER MODULE, Farmer Module — MUST HAVE, Implementation Status Tracker (+13 more)

### Community 13 - "react-native"
Cohesion: 0.06
Nodes (56): expo-image-picker, react-native, LogEntry, LogsPage(), sampleLogs, styles, typeConfig, RolesScreen() (+48 more)

### Community 14 - "package.json"
Cohesion: 0.08
Nodes (25): devDependencies, @types/react, typescript, main, name, private, version, expo-camera (+17 more)

### Community 15 - "index.js"
Cohesion: 0.06
Nodes (38): completeRegistrationEmailVerification(), crypto, { defineSecret, defineString }, emailFrom, emailHash(), emailOtpSecret, escapeHtml(), { FieldValue, Timestamp, getFirestore } (+30 more)

### Community 16 - "mockData.ts"
Cohesion: 0.14
Nodes (17): AppointmentCardProps, MessageCardProps, TechnicianCardProps, MapViewProps, appointments, farmOverview, messages, notifications (+9 more)

### Community 17 - "IdentityVerificationResult.tsx"
Cohesion: 0.18
Nodes (15): expo-status-bar, AImage, CheckIcon(), FacePhotoIcon(), FailureMark(), IdentityVerificationResult(), IdPhotoIcon(), PhotoPair() (+7 more)

### Community 19 - "📋 Collection Summary"
Cohesion: 0.12
Nodes (15): 📋 Collection Summary, 💬 Communication, 🔐 Core (Role-Based), 🗺️ Data Flow, 🗄️ DATABASE.md — AgriCare Database Diagram, 📊 Entity Relationship Diagram, 📂 Firebase Config, 🐄 Livestock (+7 more)

### Community 20 - "🧭 DECISIONS.md — AgriCare"
Cohesion: 0.12
Nodes (15): ADR-001: Expo Router — file-based routing, ADR-002: MapLibre GL + OSM tiles (free, no API key), ADR-003: React Native Reanimated for all animations, ADR-004: Hierarchical folder architecture, ADR-005: expo-image over RN Image, ADR-006: Firebase as backend (Auth, Firestore, RTDB, Storage, FCM), ADR-007: Theme token system (no hardcoded values), ADR-008: lucide-react-native for icons (replaces custom SVG + emoji) (+7 more)

### Community 21 - "test_design_system_mode.py"
Cohesion: 0.09
Nodes (10): _contrast_ratio(), _derive_dark_palette(), _filter_anti_patterns_for_mode(), _palette_is_dark(), _relative_luminance(), _select_palette_for_mode(), TestAntiPatternGating, TestEndToEndCoherence (+2 more)

### Community 22 - "authService.ts"
Cohesion: 0.35
Nodes (10): Added, messaging, onForegroundNotification(), onTokenRefresh(), registerDeviceToken(), requestNotificationPermission(), setupNotificationHandlers(), subscribeToNotificationTopic() (+2 more)

### Community 23 - "Icon"
Cohesion: 0.08
Nodes (35): AdminAppointmentsScreen(), AppointmentRecord, INITIAL_MOCK_APPOINTMENTS, safeStr(), STATUS_FILTERS, styles, AdminConsultationsScreen(), ConsultationRecord (+27 more)

### Community 25 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 26 - "(farmer)/home/index.tsx"
Cohesion: 0.18
Nodes (17): s, Technician, distanceKm(), FarmData, formatDashboardValue(), hasCoordinates(), HomeScreen(), OnlineTechnician (+9 more)

### Community 27 - "🔧 TROUBLESHOOTING.md — AgriCare"
Cohesion: 0.13
Nodes (14): `@/../../assets` path error, expo-image-picker plugin crash on startup, expo-location build failure, FCM push notifications not received on device, "fetch failed: MalformedURLException: unknown protocol: data", Firebase not connecting, Gradle build failure, INSTALL_FAILED_VERSION_DOWNGRADE (+6 more)

### Community 28 - "soundService.ts"
Cohesion: 0.19
Nodes (9): expo-audio, ensureAudioMode(), playNewChatSound(), playNotificationSound(), playWithPlayer(), SOUND_NEW_CHAT, SOUND_NOTIFICATION, SOUND_TYPING (+1 more)

### Community 29 - "📚 KNOWLEDGE.md — AgriCare"
Cohesion: 0.15
Nodes (12): Auth Flow, Domain, External Services, Firebase Project, Geographic Context, 📚 KNOWLEDGE.md — AgriCare, Permission Model (KB & Forum), Push Notifications (+4 more)

### Community 31 - "📊 GANTT.md — AgriCare Development Timeline"
Cohesion: 0.17
Nodes (11): Admin Module, ✅ COMPLETED (Aug 1-7, 2026), Farmer Module (UI Only — not wired to Firebase), 📊 GANTT.md — AgriCare Development Timeline, 🔲 PENDING — Sprint Plan (Aug 7-23), Shared, Summary, Timeline Overview (+3 more)

### Community 32 - "🤝 HANDOFF.md — AgriCare"
Cohesion: 0.17
Nodes (11): Architecture, Ban System, Current State, 🤝 HANDOFF.md — AgriCare, Key Patterns, Key Services, New Files (Aug 14 session), New Files (Aug 8 session) (+3 more)

### Community 33 - "gray"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 34 - "Tailwind CSS Utility Reference"
Cohesion: 0.05
Nodes (43): Arbitrary Values, Aspect Ratio, Background Colors, Border Color, Border Radius, Border Style, Border Width, Borders (+35 more)

### Community 35 - "📊 AgriCare — System Flowchart"
Cohesion: 0.18
Nodes (10): 1. Registration & Authentication Flow, 2. Admin Verification Flow, 3. Appointment Booking Flow (Farmer), 4. Emergency Request Flow, 5. Health Record & Follow-up Flow, 6. Chat & Messaging Flow, 7. Rating & Review Flow, 8. Community Forum Flow (+2 more)

### Community 36 - "schedule/index.tsx"
Cohesion: 0.08
Nodes (28): expo-image, { height: SCREEN_HEIGHT }, s, User, FOCUS_TYPE_OPTIONS, LivestockCategoriesScreen(), LivestockCategory, POPULAR_COW_BREEDS (+20 more)

### Community 37 - "authService.ts"
Cohesion: 0.21
Nodes (14): LoginScreen(), AuthUser, findUserByEmail(), getUser(), onAuthStateChanged(), registerFCM(), sendResetEmail(), signIn() (+6 more)

### Community 38 - "📱 AgriCare — Task Progress (Non-Technical Summary)"
Cohesion: 0.18
Nodes (10): 👤 Account & Security, 🧑‍💼 Admin Features, 📱 AgriCare — Task Progress (Non-Technical Summary), 🟢 BAGONG TAPOS (Aug 9–15), 🧑‍🌾 Farmer Features, 🔴 HINDI PA TAPOS (Minor Items Only), 📊 Progress Summary, 🟢 TAPOS NA (Completed Features) (+2 more)

### Community 39 - "Entity Relationship (Foreign Keys)"
Cohesion: 0.18
Nodes (10): 📡 API.md — AgriCare, Authentication (Firebase Auth), Backend: Firebase, Collections, Entity Relationship (Foreign Keys), Firestore Collections, Map Tiles, Realtime Database Paths (Chat) (+2 more)

### Community 40 - "🔄 AgriCare — Sequence Diagrams"
Cohesion: 0.20
Nodes (9): 1. Registration & Verification Sequence, 2. Appointment Booking Sequence, 3. Real-time Chat Sequence, 4. Emergency Request Sequence, 5. Health Record & Follow-up Sequence, 6. Rating & Review Sequence, 7. Admin Moderation Sequence, 8. Knowledge Base & Forum Sequence (+1 more)

### Community 41 - "🐄 AgriCare - Livestock Support & Service Management"
Cohesion: 0.20
Nodes (9): 🐄 AgriCare - Livestock Support & Service Management, 🏗️ Architecture (Hierarchical), 🔥 Firebase Integration, 🚀 Getting Started, 🎨 Icons, 📦 Key Dependencies, 🗺️ MapLibre + OpenStreetMap, 📱 Screens (6 Pages) (+1 more)

### Community 42 - "🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026)"
Cohesion: 0.20
Nodes (9): 🎯 Daily Velocity Target, ⚡ Priority Rules, ⚠️ Risks & Mitigations, 📌 Scope Control, 🏃 SPRINT PLAN — AgriCare MVP (Aug 7 → Aug 23, 2026), 📅 Sprint Schedule, WEEK 2 Remainder: Aug 7 (Fri) → Aug 9 (Sun) — "Foundation Finish", WEEK 3: Aug 10 (Mon) → Aug 16 (Sat) — "Core Features" (+1 more)

### Community 43 - "Common Rules for Professional UI"
Cohesion: 0.40
Nodes (5): Common Rules for Professional UI, Icons & Visual Elements, Interaction (App), Layout & Spacing, Light/Dark Mode Contrast

### Community 44 - "compilerOptions"
Cohesion: 0.22
Nodes (8): expo/tsconfig.base, compilerOptions, baseUrl, ignoreDeprecations, paths, strict, extends, include

### Community 45 - "storageService.ts"
Cohesion: 0.27
Nodes (7): @react-native-firebase/storage, storage, StoragePaths, uploadAnimalImage(), uploadChatImage(), uploadImage(), uploadProfileImage()

### Community 46 - "Brand Guidelines v1.0"
Cohesion: 0.05
Nodes (37): 1. Color Palette, 2. Typography, 3. Logo Usage, 4. Voice & Tone, 5. Imagery Guidelines, 6. Design Components, Accessibility, AI Image Generation (+29 more)

### Community 47 - "Design"
Cohesion: 0.06
Nodes (35): Banner Design (Built-in), Banner: Design Rules, Banner: Quick Size Reference, Banner: Top Art Styles, Banner: Workflow, CIP Design (Built-in), CIP: Generate Brief, CIP: Generate Mockups (+27 more)

### Community 48 - "showChatToast"
Cohesion: 0.33
Nodes (5): Completed, Completed (Aug 15 — Keyboard UX), Completed (Post-Audit Aug 9 Eve), Pending, ✅ TASKS.md — AgriCare (Updated: 2026-08-15)

### Community 49 - "Use Case Table Summary"
Cohesion: 0.25
Nodes (7): 👨‍💼 Admin (15 Use Cases), 🎯 AgriCare — Use Case Diagram, Complete Use Case Diagram, 🧑‍🌾 Farmer (16 Use Cases), ⚙️ System Automated (8 Use Cases), 👨‍⚕️ Technician (14 Use Cases), Use Case Table Summary

### Community 50 - "🎨 STYLEGUIDE.md — AgriCare"
Cohesion: 0.22
Nodes (8): Alerts & Notifications, Component Rules, Design Tokens, Icons, In-App Chat Notifications (Toast), Naming, Provider Setup (_layout.tsx), 🎨 STYLEGUIDE.md — AgriCare

### Community 51 - "seedCollection"
Cohesion: 0.15
Nodes (13): seedAdmins(), seedAnimals(), seedAppointments(), seedCollection(), seedConsultations(), seedEmergencyRequests(), seedFarmers(), seedForumPosts() (+5 more)

### Community 52 - "Canvas Design System"
Cohesion: 0.06
Nodes (35): 1. Visual Communication First, 2. Minimal Text Integration, 3. Expert Craftsmanship, 4. Systematic Patterns, Analog Meditation, Approach, Canvas Boundaries, Canvas Design System (+27 more)

### Community 53 - "Form & Input Components"
Cohesion: 0.06
Nodes (32): Accordion, Alert, Alert Dialog, Avatar, Badge, Button, Card, Checkbox (+24 more)

### Community 54 - "Tailwind CSS Responsive Design"
Cohesion: 0.06
Nodes (32): 1. Mobile-First Design, 2. Consistent Breakpoint Usage, 3. Test at Breakpoint Boundaries, 4. Use Container for Content Width, 5. Progressive Enhancement, 6. Avoid Too Many Breakpoints, Best Practices, Breakpoint System (+24 more)

### Community 55 - "icon/generate.py"
Cohesion: 0.11
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 56 - "validate_data.py"
Cohesion: 0.06
Nodes (43): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract() (+35 more)

### Community 57 - "Typography Specifications"
Cohesion: 0.06
Nodes (30): Accessibility, Base System, Best Practices, Clean & Modern, Common Font Pairings, Contrast Requirements, CSS Implementation, Editorial (+22 more)

### Community 58 - "Logo Usage Rules"
Cohesion: 0.07
Nodes (28): Absolute Don'ts, Approved Backgrounds, Before Using Logo, Clear Space, Co-branding, Color Rules, Color Usage, Color Variants (+20 more)

### Community 59 - "AGENTS.md"
Cohesion: 0.29
Nodes (6): Before you write, Expo HAS CHANGED, graphify, Ponytail, lazy senior dev mode, Ponytail: lean project work, The smallest complete change

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

### Community 64 - "json"
Cohesion: 0.06
Nodes (20): test_sync_parses_bundled_starter_template(), build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main() (+12 more)

### Community 65 - "Component Specifications"
Cohesion: 0.07
Nodes (28): Alert, Anatomy, Anatomy, Anatomy, Anatomy, Anatomy, Badge, Button (+20 more)

### Community 66 - "🏗️ ARCHITECTURE.md — AgriCare"
Cohesion: 0.40
Nodes (4): 🏗️ ARCHITECTURE.md — AgriCare, Data Flow, Folder Structure, System Architecture

### Community 67 - "📋 PROJECT.md — AgriCare"
Cohesion: 0.40
Nodes (4): Overview, 📋 PROJECT.md — AgriCare, Status, Tech Stack

### Community 68 - "Ponytail"
Cohesion: 0.40
Nodes (4): Before you write, Levels, Ponytail, The smallest complete change

### Community 69 - "html-token-validator.py"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 70 - "shadcn/ui Accessibility Patterns"
Cohesion: 0.07
Nodes (28): Accordion, Alert, ARIA Labels, Checkbox and Radio, Color Contrast, Command Palette Navigation, Component-Specific Patterns, Dialog/Modal Navigation (+20 more)

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

### Community 76 - "ui/index.ts"
Cohesion: 0.16
Nodes (18): [5.3.0] - 2026-08-14 (Fri), Added, Changed, RootLayout(), styles, FontScaleProvider(), ModalAlertProvider(), dismissChatToast() (+10 more)

### Community 79 - "design_system.py"
Cohesion: 0.05
Nodes (17): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+9 more)

### Community 81 - "dashboard/index.tsx"
Cohesion: 0.17
Nodes (20): s, TechAppointmentsScreen(), DashboardData, OverviewItem(), OverviewItemProps, QuickAccessItem(), QuickAccessItemProps, styles (+12 more)

### Community 82 - "Asset Approval Checklist"
Cohesion: 0.08
Nodes (25): Accessibility, Archival, Asset Approval Checklist, Automation Support, Color Compliance, Common Issues & Fixes, Content Accessibility, Content Quality (+17 more)

### Community 83 - "Logo AI Prompt Engineering"
Cohesion: 0.08
Nodes (25): Common Pitfalls, Core Prompt Structure, Detailed Brief, Eco/Sustainable, Effective Keywords by Style, Fashion Brand, Healthcare, Industry-Specific Prompts (+17 more)

### Community 84 - "DesignSystemGenerator"
Cohesion: 0.06
Nodes (13): DesignSystemGenerator, apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), TestReasoningMatch, read_rows(), split_values() (+5 more)

### Community 85 - "csv"
Cohesion: 0.09
Nodes (3): _rows(), TestNativeDesktopStackFreshness, TestMetricMath

### Community 87 - "Color Palette Management"
Cohesion: 0.08
Nodes (24): Accessibility Requirements, Brand Compliance Validation, Checking Contrast, Color Documentation Format, Color Extraction, Color Palette Examples, Color Palette Management, Color System Structure (+16 more)

### Community 88 - "CIP Deliverable Guide"
Cohesion: 0.08
Nodes (24): Apparel, Business Card, Car/Sedan, CIP Deliverable Guide, Core Identity, Digital Assets, Email Signature, Envelope (+16 more)

### Community 89 - "States and Variants"
Cohesion: 0.08
Nodes (24): Accessibility, Accessibility Requirements, ARIA States, Color Contrast, Color Variants, Disabled States, Error Messages, Error States (+16 more)

### Community 90 - "UI Styling Skill"
Cohesion: 0.08
Nodes (24): Accessibility Patterns, Alternative: Tailwind-Only Setup, Best Practices, Common Patterns, Component Layer: shadcn/ui, Component Library Guide, Component + Styling Setup, Core Stack (+16 more)

### Community 91 - "ChatScreen.tsx"
Cohesion: 0.12
Nodes (29): ChatScreen(), MessageSuggestion(), PresenceAvatar(), RatingCard(), REACTION_EMOJIS, ReactionPopup(), ReactionsDisplay(), ReplyPreview() (+21 more)

### Community 92 - "Workflow"
Cohesion: 0.08
Nodes (23): Art Direction Styles (Reuse from Banner), Color & Contrast, Design Best Practices, HTML Design Rules, HTML Template Structure, Option A: Chrome Headless CLI (Recommended — zero dependencies), Option B: chrome-devtools skill, Option C: Playwright script (+15 more)

### Community 93 - "slide_search_core.py"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 94 - "csv"
Cohesion: 0.07
Nodes (14): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv(), detect_domain(), _load_csv() (+6 more)

### Community 95 - "Design System"
Cohesion: 0.09
Nodes (22): Best Practices, Chart.js Integration, Command, Component Spec Pattern, Contextual Decision Flow, Decision System CSVs, Design System, Integration (+14 more)

### Community 96 - "Tailwind CSS Customization"
Cohesion: 0.09
Nodes (22): @apply Directive, Best Practices, Color Customization, Complete Tailwind Config, Configuration Examples, Content Configuration, Custom Color Palette, Custom Font Sizes (+14 more)

### Community 98 - "generate-slide.py"
Cohesion: 0.13
Nodes (10): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+2 more)

### Community 99 - "spacing"
Cohesion: 0.09
Nodes (22): $type, $value, $type, $value, $type, $value, $type, $value (+14 more)

### Community 100 - "Routing by Task Type"
Cohesion: 0.10
Nodes (19): Banner Design Tasks, Brand Identity Tasks, Component Creation, Corporate Identity Program Tasks, Design Routing Guide, Design System Migration, Icon Design Tasks, Implementation Tasks (+11 more)

### Community 101 - "json"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 102 - "shadcn/ui Theming & Customization"
Cohesion: 0.10
Nodes (19): Base Color Presets, Best Practices, Color Customization, Color Format, Component Customization, CSS Variable System, Customize Styles, Customize Variants (+11 more)

### Community 104 - "Asset Organization Guide"
Cohesion: 0.11
Nodes (18): Asset Entry (manifest.json), Asset Organization Guide, By Campaign, By Status, By Type, Cleanup Workflow, Components, Directory Structure (+10 more)

### Community 105 - "Primary Color Meanings"
Cohesion: 0.11
Nodes (18): Accessibility Considerations, Analogous, Black, Blue, Color Combinations by Industry, Color Harmony Types, Complementary, Green (+10 more)

### Community 106 - "Core Logo Types"
Cohesion: 0.11
Nodes (18): 1. Wordmark (Logotype), 2. Lettermark (Monogram), 3. Pictorial Mark (Brand Mark), 4. Abstract Mark, 5. Mascot, 6. Emblem, 7. Combination Mark, Aesthetic Styles (+10 more)

### Community 107 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 109 - "Brand Consistency Checklist"
Cohesion: 0.11
Nodes (17): Audit Frequency, Brand Consistency Checklist, Channel Audit, Collateral, Colors, Common Issues, Email, Imagery (+9 more)

### Community 110 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 111 - "Color Semantics"
Cohesion: 0.11
Nodes (17): Accent, Applying Semantic Tokens, Background & Foreground, Border & Ring, Color Semantics, Dark Mode Overrides, Destructive, Interactive States (+9 more)

### Community 112 - "Added"
Cohesion: 0.32
Nodes (8): [5.0.0] - 2026-08-09, Added, Changed, Fixed, BiometricSetupScreen(), markBiometricsAsked(), setBiometricsEnabled(), StorageBucket

### Community 113 - "(farmer)/home/appointments.tsx"
Cohesion: 0.36
Nodes (7): Appointment, AppointmentsPage(), isCoordinateText(), RequestDetail(), s, STATUS_CONFIG, cancelFarmerAppointment()

### Community 114 - "Design Principles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 115 - "Design Principles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 116 - "fontSize"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 118 - "storage.ts"
Cohesion: 0.22
Nodes (12): @supabase/supabase-js, AnimalData, saveAnimalToFirestore(), SaveResult, uploadAnimalWithImage(), uploadFarmerProfilePhoto(), uploadFarmerProof(), uploadImageToSupabase() (+4 more)

### Community 119 - "extract-colors.cjs"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 121 - "CIP Design Reference"
Cohesion: 0.13
Nodes (14): CIP Brief (Start Here), CIP Design Reference, Commands, Deliverable Categories, Design Styles, Detailed References, Generate Mockups, HTML Presentation Features (+6 more)

### Community 122 - "Icon Design Reference"
Cohesion: 0.13
Nodes (14): Available Styles, CLI Options, Commands, Generate Batch Variations, Generate Multiple Sizes, Generate Single Icon, Icon Categories, Icon Design Reference (+6 more)

### Community 123 - "Copywriting Formulas"
Cohesion: 0.13
Nodes (14): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Core Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), Formula-to-Slide Mapping (+6 more)

### Community 124 - "Copywriting Formulas"
Cohesion: 0.13
Nodes (14): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Core Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), Formula-to-Slide Mapping (+6 more)

### Community 127 - "register.tsx"
Cohesion: 0.13
Nodes (18): base64-arraybuffer, expo, expo-file-system, react-native-webview, AddressOption, AddressPicker, generateSessionId(), getInitialAddress() (+10 more)

### Community 128 - "[3.1.0] - 2026-08-03"
Cohesion: 0.67
Nodes (3): [3.1.0] - 2026-08-03, Added, Fixed

### Community 129 - "Banner Design - Multi-Format Creative Banner System"
Cohesion: 0.14
Nodes (13): Art Direction Styles (Top 10), Banner Design - Multi-Format Creative Banner System, Banner Size Quick Reference, Design Rules, Prerequisites, Security, Step 1: Gather Requirements (AskUserQuestion), Step 2: Research & Art Direction (+5 more)

### Community 130 - "Messaging Framework"
Cohesion: 0.14
Nodes (13): Core Statements, Elevator Pitches, Framework Structure, Message Architecture, Message by Audience, Message Testing, Messaging Framework, Mission Statement (+5 more)

### Community 131 - "Brand Voice Framework"
Cohesion: 0.14
Nodes (13): Brand Voice Framework, Character Spectrum, Emotion Spectrum, Language Spectrum, Step 1: Define Personality Traits, Step 2: Create Voice Chart, Step 3: Context Adaptation, Tone Spectrum (+5 more)

### Community 132 - "validate-asset.cjs"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 133 - "Layout Patterns"
Cohesion: 0.14
Nodes (13): Card Styles, Component Variants, CSS Structures, Feature Grid (3 columns), Layout Decision Flow, Layout Patterns, Layout Selection by Use Case, Metric Styles (+5 more)

### Community 134 - "Tailwind Integration"
Cohesion: 0.14
Nodes (13): Animation Tokens, Base Layer, Button Example, Component Classes, CSS Variables Setup, Dark Mode Toggle, HSL Format Benefits, shadcn/ui Alignment (+5 more)

### Community 135 - "radius"
Cohesion: 0.19
Nodes (14): $type, $value, $type, $value, $type, $value, primitive, radius (+6 more)

### Community 136 - "Layout Patterns"
Cohesion: 0.14
Nodes (13): Card Styles, Component Variants, CSS Structures, Feature Grid (3 columns), Layout Decision Flow, Layout Patterns, Layout Selection by Use Case, Metric Styles (+5 more)

### Community 140 - "registration-email-otp/index.ts"
Cohesion: 0.20
Nodes (8): decodeBase64Url(), decodeJwtPart(), firebaseKeys, hex(), hmac(), jsonHeaders, sha256(), verifyFirebaseToken()

### Community 141 - "update.md"
Cohesion: 0.15
Nodes (12): Color Presets, Examples, Files Modified, Important, Overview, Skills Used, Step 1: Gather Brand Input, Step 2: Update Brand Guidelines (+4 more)

### Community 142 - "Logo Design Reference"
Cohesion: 0.15
Nodes (12): Available Styles, Color Psychology, Commands, Design Brief (Start Here), Detailed References, Generate Logo, Industry Defaults, Logo Design Reference (+4 more)

### Community 143 - "locationService.ts"
Cohesion: 0.12
Nodes (19): expo-location, @react-native-firebase/database, LocationData, toLocationData(), useLocationTracking(), UseLocationTrackingResult, rtdb, HEARTBEAT_INTERVAL_MS (+11 more)

### Community 144 - "Token Architecture"
Cohesion: 0.15
Nodes (12): Categories, Dark Mode, File Organization, Layer 1: Primitive Tokens, Layer 2: Semantic Tokens, Layer 3: Component Tokens, Layer Overview, Migration from Flat Tokens (+4 more)

### Community 145 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 147 - "Primitive Tokens"
Cohesion: 0.17
Nodes (11): Border Radius, Color Scales, Gray Scale, Motion / Duration, Primary Colors (Blue), Primitive Tokens, Shadows, Spacing Scale (+3 more)

### Community 148 - "embed-tokens.cjs"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 149 - "validate-tokens.cjs"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 150 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 151 - "_style_is_dark_primary"
Cohesion: 0.10
Nodes (6): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution, read_rows(), TestStyleTaxonomy

### Community 153 - "Core Visual Elements"
Cohesion: 0.18
Nodes (10): Color Palette, Colors, Core Visual Elements, Logo, Logo, Quick Checks, Typography, Typography (+2 more)

### Community 154 - "inject-brand-context.cjs"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 155 - "CIP Design Style Guide"
Cohesion: 0.18
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 157 - "Quick Reference"
Cohesion: 0.18
Nodes (11): 10. Charts & Data (LOW), 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Style Selection (HIGH), 5. Layout & Responsive (HIGH), 6. Typography & Color (MEDIUM), 7. Animation (MEDIUM) (+3 more)

### Community 158 - "sync-brand-to-tokens.cjs"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 159 - "Brand"
Cohesion: 0.20
Nodes (9): Brand, Brand Sync Workflow, Quick Start, References, Routing, Scripts, Subcommands, Templates (+1 more)

### Community 160 - "Slide Strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 161 - "Component Tokens"
Cohesion: 0.20
Nodes (9): Alert Tokens, Badge Tokens, Button Tokens, Card Tokens, Component Tokens, Dialog/Modal Tokens, Input Tokens, Table Tokens (+1 more)

### Community 162 - "generate-tokens.cjs"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 163 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 164 - "duration"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 165 - "Slide Strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 168 - "Cancellation flow QA report — 2026-11-14"
Cohesion: 0.20
Nodes (9): Accepted request: technician approval required, Cancellation flow QA report — 2026-11-14, Evidence, Limits, Pending request: immediate cancellation, Result, Technician approves the next request, Technician declines, then farmer requests again (+1 more)

### Community 173 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 177 - "ui-ux-pro-max"
Cohesion: 0.25
Nodes (7): How to Use, Primary Use Cases, Recommended, Rule Categories by Priority, Skip, ui-ux-pro-max, When to Apply

### Community 178 - "Slides Reference"
Cohesion: 0.29
Nodes (6): Key Features, Knowledge Base, Slides Reference, Usage, When to Use, Workflow

### Community 179 - "HTML Slide Template"
Cohesion: 0.29
Nodes (6): Animation Classes, Background Images, Base Structure, Chart.js Integration, CSS Variables Reference, HTML Slide Template

### Community 181 - "HTML Slide Template"
Cohesion: 0.29
Nodes (6): Animation Classes, Background Images, Base Structure, Chart.js Integration, CSS Variables Reference, HTML Slide Template

### Community 184 - "Query Contract"
Cohesion: 0.29
Nodes (7): Query Contract, Step 1: Analyze User Requirements, Step 2: Generate Design System (new projects/pages), Step 2b: Persist Design System (Master + Overrides Pattern), Step 2c: Design Dials (optional), Step 3: Supplement with Detailed Searches (as needed), Step 4: Stack Guidelines

### Community 185 - "build-guide.mjs"
Cohesion: 0.29
Nodes (4): rows, sheet, table, workbook

### Community 187 - "Slides"
Cohesion: 0.33
Nodes (5): References (Knowledge Base), Routing, Slides, Subcommands, When to Use

### Community 189 - "Pre-Delivery Checklist"
Cohesion: 0.33
Nodes (6): Accessibility, Interaction, Layout, Light/Dark Mode, Pre-Delivery Checklist, Visual Quality

### Community 190 - "Prerequisites"
Cohesion: 0.33
Nodes (6): Available Domains, Available Stacks, How to Use This Skill, Output Formats, Prerequisites, Search Reference

### Community 191 - "Brand Guidelines Template"
Cohesion: 0.40
Nodes (4): Brand Guidelines Template, Document Structure, Extractable Fields, Usage

### Community 192 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 193 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 194 - "lg"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 195 - "sm"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 196 - "Example Workflow"
Cohesion: 0.40
Nodes (5): Example Workflow, Step 1: Analyze Requirements, Step 2: Generate Design System, Step 3: Supplement with Detailed Searches (as needed), Step 4: Stack Guidelines

### Community 197 - "Q: realtime ba naguupdate ang location ng mga users?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: realtime ba naguupdate ang location ng mga users?, Source Nodes

### Community 198 - "Q: Dashboard: may paraan na para mag-post ng sick-animal report. paano ito?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Dashboard: may paraan na para mag-post ng sick-animal report. paano ito?, Source Nodes

### Community 199 - "AgriCare ADB test checklist"
Cohesion: 0.40
Nodes (4): AgriCare ADB test checklist, Build and session, Farmer, Technician

### Community 200 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 201 - "xl"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 202 - "none"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 203 - "Tips for Better Results"
Cohesion: 0.50
Nodes (4): Common Sticking Points, Pre-Delivery Checklist, Query Strategy, Tips for Better Results

### Community 204 - "16"
Cohesion: 0.67
Nodes (3): $type, $value, 16

### Community 205 - "1"
Cohesion: 0.67
Nodes (3): $type, $value, 1

### Community 206 - "3"
Cohesion: 0.67
Nodes (3): $type, $value, 3

### Community 207 - "8"
Cohesion: 0.67
Nodes (3): $type, $value, 8

### Community 208 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 209 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 210 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 211 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 212 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 213 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

## Knowledge Gaps
- **15 isolated node(s):** `@expo/vector-icons`, `@fortawesome/fontawesome-svg-core`, `@react-native-firebase/app`, `expo-font`, `expo-linking` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2033 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ShadcnInstaller` connect `ShadcnInstaller` to `json`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `@expo/vector-icons`, `@fortawesome/fontawesome-svg-core`, `@react-native-firebase/app` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FontScale.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07857769973661106 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Icon` to `FontScale.tsx`, `firebase.ts`, `appointmentService.ts`, `(farmer)/map/index.tsx`, `schedule/index.tsx`, `authService.ts`, `(farmer)/messages/index.tsx`, `ui/index.ts`, `ui/index.ts`, `react-native`, `Added`, `(farmer)/home/appointments.tsx`, `dashboard/index.tsx`, `(farmer)/home/index.tsx`, `ChatScreen.tsx`, `register.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `firebase.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05955734406438632 - nodes in this community are weakly interconnected._
- **Why does `expo-router` connect `expo-router` to `FontScale.tsx`, `firebase.ts`, `(farmer)/map/index.tsx`, `schedule/index.tsx`, `(farmer)/messages/index.tsx`, `app/index.tsx`, `ui/index.ts`, `ui/index.ts`, `react-native`, `package.json`, `(farmer)/home/appointments.tsx`, `dashboard/index.tsx`, `Icon`, `(farmer)/home/index.tsx`, `ChatScreen.tsx`, `register.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `appointmentService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._