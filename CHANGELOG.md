# 📝 CHANGELOG.md — AgriCare

## [3.1.0] - 2026-08-03
### Added
- **Livestock Categories page** (`(admin)/home/livestock-categories.tsx`) — recreated with real-time Firestore `onSnapshot` listener on `livestockCategories`, full CRUD (add/edit/delete), bottom-sheet Modal form, type badges (Large/Small/Poultry), breed count, animal count, empty state, ActivityIndicator loading
- **Activity logging (logCrud)** integrated into:
  - `livestock/preview.tsx` — logs Category Created, Updated, Deleted
  - `forum/index.tsx` — logs Forum Post Created, Forum Post Deleted, Forum Reply Added, Forum Reply Deleted, Forum Reply Updated
- `livestock-categories` registered in `(admin)/home/_layout.tsx` Stack
- `services/index.ts` barrel now exports `logService`

### Fixed
- Missing `livestock-categories.tsx` file restored with proper project patterns (instance methods, theme constants, Icon component)

## [3.0.0] - 2026-08-02
### Changed (BREAKING)
- **Database restructured** to role-based collections:
  - `users/` → shared auth data for ALL roles
  - `admin/` → admin-specific (permissions, superAdmin) — FK: userId → users.id
  - `farmer/` → farmer-specific (location, animals, favorites) — FK: userId → users.id
  - `technician/` → technician-specific (rating, specializations, availability) — FK: userId → users.id
- Removed old flat `technicians/` collection (now it's `technician/` with userId FK)

## [2.2.0] - 2026-08-02
### Added
- **Login page** (`(auth)/login.tsx`) — Firebase Auth sign-in with email/password, error handling, role-based redirect
- **Registration page** (`(auth)/register.tsx`) — Create account with role selector (Farmer/Technician), validation, Firebase Auth
- **Auth index** (`(auth)/index.tsx`) — Choose Login or Register + dev quick-access buttons for each role
- Role-based routing: after login, reads user role from Firestore → routes to `(admin)`, `(farmer)`, or `(technician)`
- Technician registration info banner about admin verification
- Form validation (empty fields, password mismatch, weak password)
- Admin Livestock Categories page — full CRUD UI with list view (type badge, breed count, animal count) + bottom sheet modal form (name input, type selector, comma-separated breeds), edit/delete actions per card
- Livestock Categories connected to Firebase Firestore — real-time `onSnapshot` listener, add via `collection.add()`, edit via `doc.update()`, delete via `doc.delete()`. No mock data — all live from `livestockCategories` collection.
- Forum page: removed mock data fallback (shows empty if no Firestore data), added Edit/Delete buttons for replies (own replies or admin), inline edit form with Save/Cancel, delete from `replies` subcollection with confirmation
- Admin Appointments page: view-only monitoring with real-time Firestore, stats row, search, status filters, detail modal on tap. Removed mock fallback.
- Activity Logs page: real-time Firestore `logs` collection listener, filter by type (Auth/CRUD/System/Error), search, color-coded icons, relative timestamps, sample logs shown when collection is empty
- **Full activity logging**: All save/update/delete operations across 9 files now write to `logs` collection (livestock, forum, announcements, knowledge-base, reports, users, auth). 24 total log insertion points.

### Changed
- Moved all `(tabs)` pages to `(farmer)` directory — `(tabs)` removed entirely
- Admin Home page redesigned with GCash-style layout:
  - Green header with leaf decoration, avatar + user name, bell notification icon
  - Individual stat cards (colored backgrounds: green + orange for pending), 4-column circular icon grid on green card, Recent Activity feed with dot indicators, System Status bar, Quick Access footer
- Auto-login: `sessionService.ts` saves user credentials (uid, email, role) to AsyncStorage after login/register. On next app open, auto-redirects to correct module without login screen.

- Admin Home has dashboard stats + 8 quick-access items (each with its own page):
  Manage Livestock Categories, Knowledge Base Articles, Appointment Records,
  Consultation Records, User Management, Reports & Complaints,
  Ratings & Reviews, Auth & Role Management
- Admin uses Stack navigation inside Home tab (quick access pages push on top)

## [2.1.1] - 2026-08-02
### Fixed
- Migrated ALL Firebase services from deprecated namespaced API to **modular API** (v22-ready)
- Uses `getApp()`, `getAuth()`, `getFirestore()`, `getDatabase()`, `getStorage()`, `getMessaging()`
- No more "This method is deprecated" warnings

## [2.1.0] - 2026-08-02
### Added
- Comprehensive mock data seeder based on REQUIREMENTS.md
- `deleteAll()` function — wipes all Firestore collections + Realtime DB before seeding
- `seedUsers()` now creates **Firebase Auth accounts** (email/password) for each user
- Each user has a password field (admin123, farmer123, technician123)
- 14 Firestore collections + Realtime DB chat data
- Data: 11 users (1 admin, 5 farmers, 5 technicians), 10 animals, 7 livestock categories
- Data: 9 appointments, 3 consultations, 2 emergency requests
- Data: 6 knowledge base articles, 5 forum posts, 5 reviews, 2 reports
- Data: 6 notifications, 3 announcements, 4 chat rooms with messages

### Fixed
- All collections now have proper foreign key (FK) links to users (authorId, ownerId, farmerId, technicianId, etc.)
- Moved Seed Database button to Login screen as a floating action button (FAB) — orange, bottom-right corner
- knowledgeBase: changed from `author: string` to `authorId + authorName + authorRole`

## [2.0.0] - 2026-08-02
### Added
- `REQUIREMENTS.md` — Full MoSCoW prioritization baseline for Admin, Farmer, and Technician modules
- **Role-based architecture**: 3 separate module routes `(admin)`, `(farmer)`, `(technician)`
- **Admin Module** (6 tabs): Dashboard, Users, Technicians, Appointments, Content, Settings
- **Farmer Module** (5 tabs): Home, Map, Services, Messages, Profile
- **Technician Module** (5 tabs): Dashboard, Requests, Schedule, Messages, Profile
- **Auth flow**: `(auth)/index.tsx` — Role selection screen (routes to correct module)
- Admin Dashboard with stats grid, quick actions, recent activity
- Admin Users page with search, filter tabs, status badges
- Admin Technicians page with pending verification (Approve/Reject) + verified list
- Admin Appointments page with status-colored cards
- Admin Content Management page (Knowledge Base, Forum, Categories, Reports, Reviews)
- Admin Settings with Seed Database button + Logout

## [1.2.1] - 2025-08-02
### Changed
- Services page redesigned to match prototype (green header, 3x2 icon grid with bordered squares, simple select rows with dividers, clean minimal layout)

## [1.2.0] - 2025-08-02
### Added
- Firebase integration (@react-native-firebase: app, auth, firestore, storage, database, messaging)
- Service layer: authService, firestoreService, chatService, storageService, notificationService
- Mock data seeder (`seedDatabase.ts`) + dev button in Profile
- `google-services.json` linked in app.json
- `.npmrc` with `legacy-peer-deps=true`

## [1.1.0] - 2025-08-02
### Changed
- Replaced all emoji with `lucide-react-native` icons
- Replaced custom SVG Icon.tsx with lucide wrapper
- Login image: full-width (`contentFit="cover"`) + fade-in animation
- All tab pages wrapped in ScrollView (scrollable)
- Added SafeAreaProvider to root layout
- Buttons pushed lower on login screen
- Help banner redesigned (outlined button, man.png overflow)
- Map page uses real `<MapViewComponent>` (MapLibre + OSM tiles)

### Removed
- Custom SVG paths from Icon.tsx
- Emoji text from all screens
- expo-location (Kotlin build conflict)
- Old Expo template images (replaced with agri-care-logo.png)

## [1.0.0] - 2025-08-02
### Added
- Initial 6-page prototype with hierarchical architecture
- Component library, animation system, theme tokens, mock data
