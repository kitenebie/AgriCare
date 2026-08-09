# 🔧 TROUBLESHOOTING.md — AgriCare

## FCM push notifications not received on device
**Problem**: Sent notification from Firebase Console but nothing shows on phone (no notification bar, no in-app alert)

**Root Causes**:
1. Background message handler not registered
2. Foreground notification listener not initialized
3. Missing Android notification channel config
4. FCM token not saved to user doc (check user's `fcmTokens` array in Firestore)

**Fix**:

1. **Ensure `_layout.tsx` has handlers** (top-level + useEffect):
```typescript
// Top-level (outside component) — REQUIRED for background
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("[FCM] Background:", remoteMessage.notification?.title);
});

// In useEffect — for foreground
const unsubscribe = messaging().onMessage(async (remoteMessage) => {
  Alert.alert(remoteMessage.notification?.title, remoteMessage.notification?.body);
});
```

2. **Create `firebase.json`** at project root:
```json
{
  "react-native": {
    "messaging_android_app": {
      "messaging_android_notification_channel_id": "default",
      "messaging_android_notification_color": "#1B5E20"
    }
  }
}
```

3. **Rebuild**: `npx expo prebuild --clean && npx expo run:android`

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

## Supabase "Bucket not found" error
**Cause**: Uploading to a bucket name that doesn't exist in Supabase dashboard.
**Fix**: Ensure bucket names in code match exactly: `farmer_profile_photo`, `technician_profile_photo`, `farmers_proof`, `technician_proof`, `animals`

## Supabase "row-level security policy" error
**Cause**: RLS is enabled but no INSERT policy exists for the bucket.
**Fix**: Run in Supabase SQL Editor:
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id IN ('farmer_profile_photo','technician_profile_photo','farmers_proof','technician_proof','animals'));

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id IN ('farmer_profile_photo','technician_profile_photo','farmers_proof','technician_proof','animals'));
```

## "fetch failed: MalformedURLException: unknown protocol: data"
**Cause**: Android native `fetch()` cannot handle `data:image/...;base64,...` URIs from WebView.
**Fix**: Install `base64-arraybuffer` and detect data URIs in `uploadImageToSupabase`:
```ts
if (localUri.startsWith("data:")) {
  const matches = localUri.match(/^data:(.+?);base64,(.+)$/);
  arrayBuffer = base64Decode(matches[2]);
}
```

## INSTALL_FAILED_VERSION_DOWNGRADE
**Cause**: Phone has higher versionCode than APK being installed.
**Fix**: `adb uninstall com.kennethgimpao22.AgriCare` then re-run `npx expo run:android`

## expo-image-picker plugin crash on startup
**Cause**: Adding `"expo-image-picker"` to `app.json` plugins conflicts with existing native config.
**Fix**: Remove from plugins — the package works without a plugin entry. Only `CAMERA` permission is needed in `app.json`.
