# 🏗️ ARCHITECTURE.md — AgriCare

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AgriCare App                       │
├─────────────────────────────────────────────────────┤
│  Presentation Layer (app/) — Role-Based Routing     │
│  (auth)  → Role Selection                           │
│  (admin) → Dashboard|Users|Livestock|Forum|Profile   │
│  (farmer)→ Home|Map|Services|Messages|Profile       │
│  (technician)→ Dashboard|Requests|Schedule|Msgs|Prof│
├─────────────────────────────────────────────────────┤
│  Component Layer (components/)                       │
│  ui/ | cards/ | map/ | layout/                      │
├─────────────────────────────────────────────────────┤
│  Service Layer (services/)                           │
│  auth | firestore | chat | storage | notifications  │
├─────────────────────────────────────────────────────┤
│  Logic Layer (hooks/ | utils/ | data/)              │
├─────────────────────────────────────────────────────┤
│  Foundation (constants/ | types/)                    │
├─────────────────────────────────────────────────────┤
│  Firebase Backend                                    │
│  Auth | Firestore | RTDB | Storage | FCM            │
├─────────────────────────────────────────────────────┤
│  Supabase Storage (profile photos, IDs, proofs)     │
└─────────────────────────────────────────────────────┘
```

## Folder Structure
```
src/
├── app/
│   ├── _layout.tsx        # Root (SafeAreaProvider + Stack + FCM listeners)
│   ├── firebase.json      # Android notification channel config
│   ├── index.tsx          # Login/Welcome
│   ├── (auth)/            # Auth screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── pending-verification.tsx
│   │   ├── rejected.tsx
│   │   ├── biometric-setup.tsx
│   │   └── capture-id.tsx
│   ├── (admin)/           # Admin tab navigator (6 tabs)
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── technicians/
│   │   ├── appointments/
│   │   ├── content/
│   │   └── settings/
│   ├── (farmer)/          # Farmer tab navigator (5 tabs)
│   │   ├── home/ | map/ | services/ | messages/ | profile/
│   ├── (technician)/      # Technician tab navigator (5 tabs)
│   │   ├── dashboard/ | appointments/ | schedule/ | messages/ | profile/
├── components/       # ui/ | cards/ | map/ | layout/
│   └── shared/       # Cross-role screens (KnowledgeBaseScreen, ForumScreen)
├── services/         # Firebase service functions
├── constants/        # Theme tokens
├── hooks/            # Animation hooks
├── types/            # TypeScript interfaces
├── data/             # Local mock data (fallback)
├── utils/            # Helpers (supabase client)
└── supabase/functions/  # Edge Functions (send-push)
```

## Data Flow
```
Screen → Service → Firebase SDK → Cloud
  ↑                                  │
  └──── Real-time listeners ─────────┘
```
