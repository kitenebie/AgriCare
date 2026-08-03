# 🚀 DEPLOYMENT.md — AgriCare

## Dev Setup
```bash
npm install
npx expo run:android
```

## Firebase Config
- `google-services.json` in project root (Android)
- Registered in `app.json` → `android.googleServicesFile`
- Plugins: `@react-native-firebase/app`, `auth`, `messaging`

## Build
```bash
Remove-Item -Recurse -Force android
npx expo run:android
```

## .npmrc
`legacy-peer-deps=true` (React 19 + lucide-react-native peer conflict)
