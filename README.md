# 🐄 AgriCare - Livestock Support & Service Management

A React Native (Expo) mobile application for farmers and livestock technicians. Farmers can find nearby technicians, request veterinary services, manage appointments, and communicate with service providers.

## 📱 Screens (6 Pages)

1. **Login** - Welcome screen with login/register (full-width image, fade-in animation)
2. **Home** - Farm overview dashboard with quick access menu
3. **Map** - Find nearby technicians with MapLibre GL + OpenStreetMap tiles
4. **Services** - Request service & view appointments
5. **Messages** - Chat with technicians & notifications
6. **Profile** - User profile, settings & dev tools

## 🏗️ Architecture (Hierarchical)

```
src/
├── app/                    # Expo Router - Screen definitions
│   ├── _layout.tsx         # Root layout (Stack + SafeAreaProvider)
│   ├── index.tsx           # Login/Welcome screen
│   └── (tabs)/             # Tab-based navigation (5 tabs)
├── components/             # Reusable UI components
│   ├── ui/                 # Base components (Avatar, Badge, Button, Card, Icon)
│   ├── cards/              # Domain cards (Technician, Appointment, Message)
│   ├── map/                # MapLibre map wrapper
│   └── layout/             # Layout components
├── constants/              # Theme tokens
├── hooks/                  # Custom hooks (animations)
├── services/               # Firebase services layer
├── types/                  # TypeScript interfaces
├── data/                   # Mock data (local fallback)
└── utils/                  # Helper functions
```

## 🔥 Firebase Integration

- **Firestore** — Users, animals, technicians, appointments, reviews
- **Realtime Database** — Real-time chat, typing indicators, online status
- **Storage** — Chat images (Firebase) + Profile photos & documents (Supabase)
- **FCM** — Push notifications
- **Auth** — Email/password authentication

## 🗄️ Supabase Storage

Image uploads for registration: `farmer_profile_photo`, `technician_profile_photo`, `farmers_proof`, `technician_proof`, `animals`

## 🗺️ MapLibre + OpenStreetMap

Free map tiles via `tile.openstreetmap.org` — no API key needed.

## 🎨 Icons

Uses `lucide-react-native` with `react-native-svg`.

## 🚀 Getting Started

```bash
cd C:\Users\kenne\Desktop\em-res\AgriCare
npm install
npx expo run:android
```

## 📦 Key Dependencies

- `expo` ~57.0.9 / `expo-router` ~57.0.9
- `@react-native-firebase/*` (app, auth, firestore, storage, database, messaging)
- `@maplibre/maplibre-react-native` ^10.4.2
- `lucide-react-native` ^0.460.0
- `react-native-reanimated` 4.5.1
- `react-native-svg` ^15.0.0
- `react-native-webview` 13.16.1
- `expo-local-authentication` ~57.0.2
- `base64-arraybuffer` (base64 → ArrayBuffer for Supabase uploads)
- `@supabase/supabase-js` (Supabase client)
