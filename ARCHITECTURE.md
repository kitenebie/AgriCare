# 🏗️ ARCHITECTURE.md — AgriCare

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AgriCare App                       │
├─────────────────────────────────────────────────────┤
│  Presentation Layer (app/) — Role-Based Routing     │
│  (auth)  → Role Selection                           │
│  (admin) → Dashboard|Users|Technicians|Appts|Content│
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
└─────────────────────────────────────────────────────┘
```

## Folder Structure
```
src/
├── app/
│   ├── _layout.tsx        # Root (SafeAreaProvider + Stack)
│   ├── index.tsx          # Login/Welcome
│   ├── (auth)/            # Role selection (dev: manual, prod: auto)
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
├── services/         # Firebase service functions
├── constants/        # Theme tokens
├── hooks/            # Animation hooks
├── types/            # TypeScript interfaces
├── data/             # Local mock data (fallback)
└── utils/            # Helpers
```

## Data Flow
```
Screen → Service → Firebase SDK → Cloud
  ↑                                  │
  └──── Real-time listeners ─────────┘
```
