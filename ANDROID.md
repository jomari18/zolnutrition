# ZolNutrition Android

App name **ZolNutrition**, package **com.zolnutrition.app**, version **5.0.0** (versionCode 1). React 19/Vite 7 with Capacitor core/Android/CLI 8.5.2 and App 8.1.2. Minimum Android 7 / API 24, target and compile API 36. Use an updated Android System WebView.

## Install the debug APK

1. Transfer `outputs/ZolNutrition-debug.apk` to your Android phone.
2. Open it in Files; permit that file manager to install unknown apps if Android requests it.
3. Install, open ZolNutrition, and sign in with your existing account or register using email OTP.
4. You may disable the file manager's install permission afterward.

With USB debugging, use `adb install -r outputs/ZolNutrition-debug.apk` instead.

This is a debug-signed test APK, not a Play Store release. Rebuilds signed by a different debug key require uninstalling the previous app; this clears local settings/session but not server records. A production release needs a stable private release-signing key.

## Preserved behavior and Android adjustments

All web features and the password/OTP fixes remain. Vite assets, fonts, illustrations and the basic-food catalog are bundled and load from the app's local HTTPS origin, without a development PC. Capacitor handles system-bar insets; the keyboard resizes the activity. Dialogs/sheets scroll within the visible viewport.

Back closes the top dialog/sheet first. Otherwise it returns other dashboard tabs to Meals, steps backward through onboarding, or returns registration/OTP to sign-in. On root screens it minimizes the app. Busy screen navigation is consumed. Browser-local day overrides and weight-reminder baselines are separate from APK-local settings; server account records sync through Supabase.

## Backend requirements

Existing public Supabase URL/publishable key remain configured in `src/client.js`. No schema, RLS or hosted auth configuration was changed. OTP delivery requires the existing hosted Supabase email/SMTP configuration. Registration, sign-in, onboarding save, meal/saved-meal operations, targets and weight records need internet and the existing Supabase project.

For another backend, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building. Never bundle service-role keys, database passwords or SMTP secrets. No extra Android credentials are required for the current email-code flow. OAuth/deep links, push notifications and offline sync were not added.

Open Food Facts packaged search needs its public service and is subject to outages/rate limits. Basic-food reference data is bundled. Account operations do not become offline-capable just because the app is installed. Existing organization egress restrictions can affect both web and Android.

## Rebuild on Windows

Install Node.js 22.12+ (24 works), Android Studio 2025.2.1 or newer, Java JDK 21, Android SDK Platform 36, Build-Tools 35.0.0 and Platform-Tools. Accept licenses in SDK Manager. Set `JAVA_HOME` to your JDK and `ANDROID_HOME` to the Android SDK (or configure SDK/JDK paths in Android Studio).

From the folder containing package.json:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run android:debug
```

This builds Vite, syncs Capacitor, invokes Gradle assembleDebug and copies the APK to `outputs/ZolNutrition-debug.apk`. Gradle also keeps it at `android/app/build/outputs/apk/debug/app-debug.apk`.

To use Android Studio:

```powershell
npm.cmd run android:sync
npm.cmd run android:open
```

Run `android:sync` after web edits before building in Android Studio. This distributable app uses bundled assets; do not set server.url to a development address.

## Validation and limitations

20 unit tests and the production web build pass. The recovered project's full mocked browser regression passed for OTP/onboarding, meals, scaling, undo, saved meals, targets, weights, mobile layouts and themes. Back dispatch unit tests cover dialog priority and navigation. Browser simulations also pass for Back routing, dialog dismissal, password visibility reset and no horizontal overflow at 320/390/430/768px. These simulate the web handlers, not the Android bridge or operating system. Phone execution is still required; there is no attached Android device/emulator here.

A read-only Supabase Auth settings check in the preceding build returned HTTP 200 and allowed https://localhost. This validates basic endpoint/key connectivity, not account-specific RLS or email delivery. Open Food Facts returned HTTP 503 during that check; mocked packaged-food tests passed.

On your phone test cold launch, keyboard/date input, gesture/hardware Back, sheet scrolling, rotation, background/resume, OTP/resend, fresh onboarding, sign-out/in, session restoration, meal edit/delete/undo, and account isolation. No real account or production records were created during testing.

The existing Vite size warning concerns the separately loaded USDA catalog bundled in the APK. It does not download that catalog from Supabase.

## APK build verification

Gradle assembleDebug completed successfully. APK package/signature verification passed: com.zolnutrition.app, version 5.0.0, minimum SDK 24, target SDK 36, debug-signed. All 23 production web assets match the APK contents byte-for-byte. Size: 4,994,088 bytes.

SHA-256: `e139ed8d7c1eb5b51bd75877b6b984ae1b23488f262214c997cb3d4b8cc51580`

This is build/package verification, not an installation test on a physical device.

## Icon source update — 2026-10-06

The new user-supplied Z/leaf icon replaces native launcher/splash source assets and adds browser/Apple touch icons. Capacitor sync has copied the updated web assets. The previously delivered APK and checksum above refer to the earlier icon/build; rebuild the native project to obtain a new APK. This icon update was not compiled with an Android SDK.
