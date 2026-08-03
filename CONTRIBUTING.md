# 🤝 CONTRIBUTING.md — AgriCare

## Setup
```bash
cd C:\Users\kenne\Desktop\em-res\AgriCare
npm install
npx expo run:android
```

## Firebase Setup
1. `google-services.json` already in project root
2. Firebase project: `agecare-ca137`
3. Package: `com.kennethgimpao22.AgriCare`

## Seed Mock Data
Go to Profile tab → tap "🌱 Seed Database (Dev)" button (one-time only)

## Code Rules
- Follow hierarchical architecture
- Services in `src/services/`, screens in `src/app/`
- Use `lucide-react-native` for icons (via `<Icon>` wrapper)
- All pages must be scrollable (`ScrollView`)
- No emoji in code — use Icon component
- `.npmrc` has `legacy-peer-deps=true`
