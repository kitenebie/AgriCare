# 📚 KNOWLEDGE.md — AgriCare

## Domain
Rural Philippines livestock management — connects farmers with veterinary technicians.

## Users
- **Farmer**: manage animals, request services, chat with technicians
- **Technician**: receive requests, manage schedule, chat with farmers

## Service Types
Health Check | Vaccination | Treatment | De-worming | A.I. | Others

## Firebase Project
- Project ID: `agecare-ca137`
- Storage Bucket: `agecare-ca137.firebasestorage.app`
- Android Package: `com.kennethgimpao22.AgriCare`
- API Key: `AIzaSyD6Od4_Jj-EUt8kt4cZQGGNPZ9rQuRNry0`

## Geographic Context
- Primary: Bulacan, Philippines (~14.60°N, 120.98°E)
- Language: Filipino/Tagalog (UI in English)

## Supabase Storage
- Buckets: `farmer_profile_photo`, `technician_profile_photo`, `farmers_proof`, `technician_proof`, `animals`, `animals1`, `animals2`, `animals3`
- All buckets are PUBLIC (no auth needed for reads)
- RLS policies required for INSERT (public uploads during registration)

## External Services
- **Face Detection**: `https://earms.online/face-detection/{sessionId}` — WebView-based face capture, returns base64 image via injected JS `postMessage`
- **Supabase**: Image storage (profile photos, IDs, proof documents)
- **Firebase**: Auth, Firestore (data), RTDB (chat), FCM (push)
- **OpenStreetMap**: Map tiles (free, no API key)

## Auth Flow
1. Register → status: `pending` → pending-verification page
2. Admin approves → status: `active` → can login
3. Admin rejects → status: `rejected` → rejected page with reasons
4. First login → biometric setup prompt (enable/skip)
5. Next app open → session check → biometric gate → auto-redirect
6. Biometric fails → shows Log In / Create Account buttons
