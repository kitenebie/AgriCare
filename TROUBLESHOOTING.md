# 🔧 TROUBLESHOOTING.md — AgriCare

## npm install peer dep conflict
**Fix**: `.npmrc` already has `legacy-peer-deps=true`

## expo-location build failure
**Fix**: Removed from project (Kotlin interface mismatch with SDK 57)

## `@/../../assets` path error
**Fix**: Use relative paths (`../../../../assets/app/file.png`)

## Metro bundler stale cache
**Fix**: `npx expo start --clear`

## Gradle build failure
**Fix**:
```powershell
Get-Process -Name java | Stop-Process -Force
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches"
Remove-Item -Recurse -Force android
npx expo run:android
```

## Firebase not connecting
**Fix**: Ensure `google-services.json` is in project root and `app.json` has `"googleServicesFile": "./google-services.json"`

## Map shows no tiles
**Fix**: MapLibre uses native rendering — won't work on web. Test on device/emulator.
