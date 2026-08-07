# 📋 PROJECT.md — AgriCare

## Overview
**AgriCare** is a mobile application for livestock support and service management, connecting farmers with veterinary technicians in rural Philippines.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 57) |
| Routing | Expo Router (file-based) |
| Language | TypeScript |
| Animations | React Native Reanimated 4.5.1 |
| Maps | MapLibre GL + OpenStreetMap tiles |
| Icons | lucide-react-native + react-native-svg |
| Backend | Firebase (Firestore, RTDB, Storage, Auth, FCM) |
| Images | expo-image |

## Status
- ✅ 6 pages with animations
- ✅ Hierarchical architecture
- ✅ Firebase integrated (all services)
- ✅ Mock data seeder for Firebase
- ✅ MapLibre with OSM tiles (no API key)
- ✅ lucide-react-native icons
- ✅ Real-time chat service (RTDB)
- ✅ Push notification service (FCM)
- ✅ Auth flow connected to Firebase (login/register with role-based routing)
- ✅ Auto-login via AsyncStorage session persistence
- ✅ Admin module: Dashboard, Livestock CRUD, Forum, Appointments, Activity Logs
- ✅ Role-based DB structure (users → admin/farmer/technician with FK)
- 🔲 Farmer screens wired to live Firestore data
- 🔲 Technician module (0% — placeholder screens only)
- 🔲 Real-time chat UI + image upload
- 🔲 FCM push notifications wired to UI
