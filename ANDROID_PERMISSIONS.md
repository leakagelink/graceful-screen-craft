# Android permission setup

After pulling this update, install dependencies and sync Capacitor before rebuilding the APK:

```powershell
git pull
npm install
npm run build
npx cap sync android
npx cap open android
```

In `android/app/src/main/AndroidManifest.xml`, keep these entries directly inside `<manifest>` and before `<application>` (do not duplicate existing entries):

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

`POST_NOTIFICATIONS` is also supplied by the synced Local Notifications plugin. Location and camera must remain declared in the app manifest for their native runtime prompts.

The Local Notifications library declares `SCHEDULE_EXACT_ALARM`, but Vahakam does not schedule exact alarms. To avoid requesting that unrelated special access, add `xmlns:tools="http://schemas.android.com/tools"` to the root `<manifest>` element and this entry with the other permissions:

```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />
```

After logging in, the app explains the three permissions. Tap **Allow permissions** to show Android's Location, Camera and Notifications Allow/Deny prompts in sequence. **Not now** skips the screen; permissions can later be requested from **Driver → Account → Device permissions**.

Publish the web app before syncing if `capacitor.config.ts` uses the published app URL. Then open Android Studio and build a new APK. Existing installed APKs cannot show the new native prompts until they are replaced with this rebuilt APK.
