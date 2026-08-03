# 🤝 HANDOFF.md — AgriCare

> **Last Updated**: 2026-08-02
> **Last Tasks**: Login & Register pages connected to Firebase Auth, role-based routing

## Current State
- **Role-based routing**: `(admin)`, `(farmer)`, `(technician)` modules
- **Admin module DONE**: Dashboard, Users, Technicians (verify/reject), Appointments, Content, Settings
- **Farmer module**: Layout + placeholder screens
- **Technician module**: Layout + placeholder screens
- Firebase fully integrated (Auth, Firestore, RTDB, Storage, FCM)
- **Login & Register pages**: Connected to Firebase Auth with role-based redirect
- `.npmrc` with `legacy-peer-deps=true`

## What To Do Next
0. **Fix build error** — check Gradle logs, likely Firebase native module conflict
1. `npm install` then `npx expo run:android`
2. Tap "🌱 Seed Database" in Profile to populate Firebase
3. Wire screens to read from Firebase (replace local mockData imports)
4. Implement real auth flow (login/register screens → Firebase Auth)
5. Wire chat screen to `chatService.ts` (real-time messages)

## Key Files
| File | Purpose |
|------|---------|
| `src/services/firebase.ts` | Core config & constants |
| `src/services/authService.ts` | Auth functions |
| `src/services/firestoreService.ts` | Firestore CRUD |
| `src/services/chatService.ts` | Real-time chat (RTDB) |
| `src/services/storageService.ts` | Image uploads |
| `src/services/notificationService.ts` | FCM push notifications |
| `src/services/seedDatabase.ts` | Mock data seeder |
| `src/components/ui/Icon.tsx` | lucide-react-native wrapper |
| `google-services.json` | Firebase Android config |
| **`REQUIREMENTS.md`** | MoSCoW baseline (Admin/Farmer/Technician modules) |

## Baseline Reference
All feature development follows `REQUIREMENTS.md`. Use its Implementation Status Tracker to check what's done vs pending.
