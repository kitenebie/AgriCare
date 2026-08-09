# 🧭 DECISIONS.md — AgriCare

## ADR-001: Expo Router — file-based routing
## ADR-002: MapLibre GL + OSM tiles (free, no API key)
## ADR-003: React Native Reanimated for all animations
## ADR-004: Hierarchical folder architecture
## ADR-005: expo-image over RN Image
## ADR-006: Firebase as backend (Auth, Firestore, RTDB, Storage, FCM)
## ADR-007: Theme token system (no hardcoded values)
## ADR-008: lucide-react-native for icons (replaces custom SVG + emoji)
## ADR-009: .npmrc legacy-peer-deps=true (React 19 compat)
## ADR-010: @react-native-firebase (native SDK, not JS SDK)
## ADR-011: WebView Face Detection over native camera — Android kills activity on `launchCameraAsync`, causing black screen + state loss. Solution: embed `earms.online/face-detection` in a WebView, inject JS to intercept captured image (base64), returns to RN via `postMessage`.
## ADR-012: Immediate upload on capture — Upload to Supabase as soon as photo is taken (not on form submit). Provides faster UX and ensures no data loss if user navigates away.
## ADR-013: Biometric authentication gate — `expo-local-authentication` for optional fingerprint/face unlock. First login prompts setup; subsequent app opens require biometric before auto-login. Stored in AsyncStorage (`@agricare_biometrics_enabled`).
## ADR-014: Supabase Storage for images (not Firebase Storage) — Simpler public URL generation, free tier generous, `base64-arraybuffer` for WebView data URI uploads.
