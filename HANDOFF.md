# 🤝 HANDOFF.md — AgriCare

> **Last Updated**: 2026-08-15
> **Last Tasks**: KeyboardAvoidingView on all forms, Custom Modal Alert, Toast Notification

## Current State

### Overall Progress
- **Admin module ~80%** — Dashboard, Users (with approve/reject), Message Reports, Forum, Livestock, Logs
- **Farmer module ~70%** — Home, Map, Services, Messages (1-on-1 chat), Health Records (view), Profile
- **Technician module ~85%** — Dashboard, Schedule, Appointments (specialization-filtered), Map, Chat (with rate request + report), Health Records (form), Profile
- **Shared systems DONE**: Chat, Rating, Calendar, Notifications, FCM Push, Ban/Report, Location Tracking, Knowledge Base, Forum
- **UX Polish DONE**: Custom Modal Alert (replaced native Alert.alert()), Toast Notifications, KeyboardAvoidingView on all 22 form screens

### Architecture
- **Framework**: React Native (Expo SDK 57) + expo-router (file-based routing)
- **Backend**: Firebase (Auth, Firestore, RTDB, Storage, FCM)
- **Target**: Android (Bulacan, Philippines)
- **MVP Deadline**: Aug 23, 2026

## Key Services

| Service | File | Purpose |
|---------|------|---------|
| Auth | `authService.ts` | Sign in/up, session, role routing |
| Chat | `chatService.ts` | RTDB rooms, messages, typing, online status |
| Appointment | `appointmentService.ts` | Accept/decline + auto-chat + calendar + FCM |
| Calendar | `calendarService.ts` | Device calendar events on accept/decline |
| Rating | `ratingService.ts` | Rate requests, star ratings, average calc |
| Push | `pushService.ts` | FCM notification queueing for Cloud Function |
| Location | `locationService.ts` | GPS tracking to RTDB |
| Notification | `notificationService.ts` | FCM token management, permission |
| Session | `sessionService.ts` | AsyncStorage session persistence |
| Log | `logService.ts` | Activity logging to Firestore |

## Registration & Account Flow

```
Register (camera selfie + ID/proof) → status: 'pending'
    → Pending Verification Screen
    → Admin approves/rejects in User Management
    → User gets FCM notification
    → status: 'active' → can login
```

**Login status checks**: pending → verification screen, rejected → error, banned → suspended alert, deactivated → permanent block, active → app

## Ban System

- Admin can ban from Message Reports page or User Management
- Durations: 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months, 6 months, 1 year, permanent
- `BanGuard` component in farmer + technician layouts: real-time Firestore listener kicks user mid-session
- Login blocks banned/deactivated users

## New Files (Aug 8 session)

```
src/services/calendarService.ts    — Device calendar CRUD
src/services/pushService.ts        — FCM push queue
src/services/ratingService.ts      — Rate request + submit rating
src/components/BanGuard.tsx         — Real-time ban enforcement
src/app/(auth)/pending-verification.tsx  — Post-registration waiting screen
src/app/(admin)/home/message-reports.tsx — Admin moderation page
```

## New Files (Aug 14 session)

```
src/components/ui/ModalAlert.tsx        — Custom animated modal alert (replaces Alert.alert)
src/components/ui/ToastNotification.tsx — In-app chat toast notification
```

## What To Do Next

1. **Navigation buttons** — Add grid items on farmer home & technician dashboard linking to KB & Forum pages
2. **OpenRouteService API key** — register at openrouteservice.org, update `src/constants/config.ts`
3. **Chat image picker** — expo-image-picker → upload to Firebase Storage → display in chat
4. **Final testing** — all flows end-to-end, edge cases
5. **Polish** — loading states, error handling, empty states

## Key Patterns

- **All Firestore writes** use `firestore.FieldValue.serverTimestamp()` for `createdAt`/`updatedAt`
- **Notifications**: always write to both `notifications` collection (in-app) AND `pushQueue` (FCM)
- **Chat messages**: go through `chatService.sendMessage()` which updates room metadata
- **Status values**: `pending` | `active` | `banned` | `deactivated` | `rejected`
- **Tab navigation**: uses `tabPress` listener with `e.preventDefault()` + `router.replace()` to always reset stack
- **File imports**: use `@/` alias → resolves to `./src/`
- **Alerts**: use `modalAlert()` from `@/components/ui/ModalAlert` (NOT native `Alert.alert()`)
- **Forms**: all form screens have `KeyboardAvoidingView` wrapping — iOS uses `padding`, Android uses `height`
