## [5.1.0] - 2026-08-09 (Eve)
### Added
- **Supabase Edge Function for FCM Push** (`supabase/functions/send-push/index.ts`) — Deployed function that receives FCM tokens and sends push notifications via Firebase FCM v1 API using service account JWT authentication. No Firestore `pushQueue` needed.
- **Single FCM Token per User** — Changed from `fcmTokens[]` (array) to `fcmToken` (string). Every login: delete old token → get fresh token → saves single field. Token refresh overwrites instead of accumulating.
- **Background Message Handler** (`src/app/_layout.tsx`) — Added `messaging().setBackgroundMessageHandler()` at module level to handle notifications when app is killed/backgrounded. Shows notification in system bar automatically.
- **Foreground Notification Handler** (`src/app/_layout.tsx`) — Added `messaging().onMessage()` listener that shows `Alert.alert()` when notification arrives while app is open.
- **firebase.json** — Android notification channel config for default notification handling.
- **pushService.ts refactor** — Now calls `supabase.functions.invoke('send-push')` directly instead of writing to Firestore `pushQueue`. Reads single `fcmToken` field.
- **notificationService.ts refactor** — Rewrote token management: `registerDeviceToken()` now deletes old → generates new, `onTokenRefresh()` overwrites instead of appending.

### Fixed
- **FCM notifications not appearing** — Issue was missing background handlers + no notification channel config + multiple stale tokens per user accumulating. All three fixed.
- **Supabase secrets set PowerShell issue** — Documented workaround: use `.env.secrets` file with `Get-Content` + `-replace` instead of piping JSON directly to `secrets set`.

### Removed
- **Firestore `pushQueue` collection** — No longer needed; Supabase Edge Function is more direct.
- **`fcmTokens` array field** — Replaced with single `fcmToken` string for cleaner model.

---

## [5.0.2] - 2026-08-09 (Afternoon)
### Fixed
- **Feature Audit Complete** — Verified all features across admin, farmer, technician roles. 12/14 farmer features done, 12/13 technician features done, 13/13 admin features done.
- **Identified missing features**:
  - Farmer Knowledge Base reader page (admin has the content management, farmer has no UI)
  - Farmer Community Forum page (admin manages, farmer can't participate)
  - Technician Knowledge Sharing page (no technician-facing knowledge publishing UI)
  - Technician Community Forum page (no technician forum participation UI)
  - OpenRouteService API key (code exists, need registration at openrouteservice.org)
- **Cloud Function no longer in pending** — Replaced by Supabase Edge Function ✅

---

## [5.0.1] - 2026-08-09 (Morning)
### Added
- **FCM notification handlers in _layout.tsx** — Background + foreground message listeners. Background handler triggers notification bar, foreground shows Alert.
- **firebase.json** — Android notification channel for FCM defaults.
- **Verified 4 completed tasks** — my-animals CRUD, farmer appointment booking, farmer emergency request, admin dashboard live stats were all already implemented (not just UI).

### Fixed
- **FCM handlers never initialized** — Functions existed in notificationService.ts but were never called/registered anywhere in the app.

---


## [5.0.1] - 2026-08-09 (Sun)
### Fixed
- **FCM Push Notifications** — Added missing notification handlers:
  - `messaging().setBackgroundMessageHandler()` at module top-level (outside component) for background/killed state
  - `messaging().onMessage()` listener in `_layout.tsx` useEffect hook for foreground alerts
  - Handlers were defined in `notificationService.ts` but never initialized — now working end-to-end
- **Android Notification Channel** — Created `firebase.json` with default channel config (`messaging_android_notification_channel_id: "default"`, color: `#1B5E20`)
- **FCM Reception** — Notifications now appear in notification bar when app is background/killed, show Alert when foreground

### Verified
- **Farmer Livestock CRUD** — Already implemented (Modal, handleEdit, handleDelete in my-animals.tsx)
- **Farmer Appointment Booking** — Already implemented (full booking flow in services/index.tsx)
- **Farmer Emergency Request** — Already implemented (custom-service.tsx saves to customServices collection)
- **Admin Dashboard Live Stats** — Already implemented (onSnapshot listeners on Users, Appointments, Reports, Consultations)

### Pending (Truly Remaining)
- Cloud Function for FCM push queue (optional for MVP — Firebase Console direct send works if using Compose Notification)
- OpenRouteService API key registration (technician map routing)
- Final integration testing (Aug 23)

## [5.0.0] - 2026-08-09
### Added
- **Biometric Authentication** (`src/app/(auth)/biometric-setup.tsx`) — After first login, prompts user to enable fingerprint/face unlock; on next app open, requires biometric verification before auto-login
- **Rejected Account Page** (`src/app/(auth)/rejected.tsx`) — Full-screen UI for rejected users showing: rejection reasons (bullet list), "What can you do?" steps, Re-Register and Back to Login buttons
- **Face Detection WebView** — Profile photo capture replaced with `https://earms.online/face-detection/{sessionId}` WebView; uses injected JS to intercept captured face image (base64) from the web page
- **User Detail Drawer** (admin) — Bottom sheet on user card tap showing: profile photo, contact info, expertise chips, uploaded documents (ID/license images), action buttons (approve/reject/delete)
- **Reject Reason Modal** (admin) — 20 pre-defined checkbox reasons + textarea for custom notes; formatted bullet-point message sent to user via notification + FCM
- **Storage Bucket Type Safety** (`StorageBucket` type) — Restricts uploads to valid Supabase buckets: `animals`, `technician_profile_photo`, `technician_proof`, `farmer_profile_photo`, `farmers_proof`
- **Immediate Upload on Capture** — Profile photos upload to Supabase immediately after WebView capture (no waiting for form submission)
- **Re-Registration Flow** — Rejected users get pre-filled form with their previous data; role toggle disabled; back button returns to rejected page
- **Session Check on Welcome Page** — Shows ActivityIndicator while checking existing session; handles all statuses (pending/rejected/banned/active) before showing buttons
- **Biometric Utilities** in `sessionService.ts`: `isBiometricsEnabled`, `setBiometricsEnabled`, `hasBiometricsBeenAsked`, `markBiometricsAsked`, `authenticateWithBiometrics`
- `base64-arraybuffer` dependency — converts base64 data URIs to ArrayBuffer for Supabase upload
- `CAMERA` permission added to `app.json` android permissions

### Fixed
- **"Bucket not found" error** — Updated all upload calls to use correct Supabase bucket names matching dashboard
- **"data: URI fetch failed" error** — `uploadImageToSupabase` now detects `data:` URIs and uses `base64-arraybuffer` decode instead of native `fetch()`
- **Black screen after camera** — Replaced `ImagePicker.launchCameraAsync` (Android activity kill) with WebView-based face detection
- **RLS "row-level security" upload error** — Documented fix: add INSERT/SELECT policies for public uploads on registration buckets
- **Duplicate `Platform` import** crash in register.tsx — removed redundant import
- **INSTALL_FAILED_VERSION_DOWNGRADE** — `adb uninstall` before reinstall when version code is lower

### Changed
- `register.tsx` — Profile photo via WebView face detection instead of native camera; supports re-registration with pre-filled params
- `login.tsx` — Redirects rejected users to dedicated rejected page; checks biometrics setup after first login
- `app/index.tsx` — Biometric gate before auto-login; rejected status redirect; loading indicator while checking
- `(admin)/home/users.tsx` — User cards open drawer on tap; reject uses modal with checkboxes; removed emoji icons
- `storage.ts` — `StorageBucket` type, base64 data URI support, convenience upload functions per bucket
- `sessionService.ts` — Added biometric helper functions + AsyncStorage keys

## [4.0.0] - 2026-08-08
### Added
- **Rating System** (`src/services/ratingService.ts`) — Technician sends rate request via pre-built chat suggestion button; farmer sees floating 5-star rating card with animal image; updates technician's average rating in Firestore
- **FCM Push Service** (`src/services/pushService.ts`) — Queues push notifications to Firestore `pushQueue` collection for Cloud Function processing
- **Calendar Service** (`src/services/calendarService.ts`) — Creates device calendar events on appointment accept (1hr + 1day alarms), deletes on decline; creates "AgriCare" calendar on device
- **BanGuard Component** (`src/components/BanGuard.tsx`) — Real-time Firestore listener on user status; kicks banned/deactivated users mid-session with alert + redirect to login
- **Pending Verification Screen** (`src/app/(auth)/pending-verification.tsx`) — Step progress UI shown after registration while awaiting admin approval
- **Admin Message Reports Page** (`src/app/(admin)/home/message-reports.tsx`) — View reported chat messages, Resolve & Notify reporter, Dismiss, or Ban/Deactivate the violator (1 day → permanent)
- **Report icon on chat messages** — Shield icon on every received message; tap to report as offensive; saves to `reports` collection + notifies all admins via FCM
- **Admin User Approval** — Updated `(admin)/home/users.tsx` with Approve (✅) and Reject (❌) buttons for pending accounts; sends FCM + in-app notification on approve/reject
- **Profile photo capture** (camera only) required at registration for both farmer & technician
- **Valid ID required** for farmer registration; proof/license required for technician
- **Specialization filtering** on technician Available Requests page — only shows appointments matching their expertise
- **Rate request requires appointment** — Technician can only send rate request if they have a confirmed appointment with the farmer
- **Health Record form → Chat + Notifications** — On submit: sends formatted summary to farmer chat + FCM notification to both parties
- **Tab navigation reset** — Tapping Home/Messages/Profile tab icon always resets to main page (fixes stale stack screens)
- **"Message Reports" quick access** on admin dashboard grid
- `expo-calendar` plugin + `READ_CALENDAR`/`WRITE_CALENDAR` permissions in `app.json`

### Fixed
- **Android bundling crash** (`java.lang.reflect.InvocationTargetException`) — caused by 71KB+ padded source files crashing Hermes. Cleaned: `schedule/index.tsx` (71KB→18KB), `dashboard/index.tsx` (25KB→14KB), `appointments/index.tsx` (17KB→11KB)
- **Health Records form.tsx** — full rewrite (was 320K lines of blank padding with syntax error)
- **ChatScreen.tsx** — removed unused `Modal` import, fixed `"x"` → `"close"` icon name, replaced non-existent `"star-outline"` with text `★`/`☆` characters
- **Login now checks** `pending`, `rejected`, `banned`, `deactivated` statuses before routing

### Changed
- `appointmentService.ts` — now creates calendar events on accept, FCM push to farmer, deletes calendar on decline
- `authService.ts` — `signUp()` now accepts and saves `photoURL` from registration
- `register.tsx` — profile photo is camera-only (no gallery upload), redirects to pending-verification after register
- `app/index.tsx` — checks Firestore user status on auto-redirect (pending → verification screen, banned → login)

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
