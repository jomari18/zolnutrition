# ZolNutrition — React and Android

A working app design preview based on the supplied ZolNutrition mockups, using React 19 + Vite 7 + the existing Supabase project. The dark Inter/Manrope design answers: your daily targets, what you have eaten, and what remains (or is over).

## Live Demo
[Open ZolNutrition](https://zolnutrition.netlify.app/)

## Design preview scope

- Meal rows use aligned pencil/trash actions, 44px controls, tinted macro chips and a separate action row in narrow panels.
- Desktop sidebar navigation; mobile bottom tabs and floating logger remain available.
- Mountain calorie card with target, consumed, remaining/over; macro cards retain protein red, carbs blue, fat yellow.
- Seven-day calorie intake, meals, quick logger, and compact weight/target panels use account records without extra queries. Unlogged days show a dash, and averages include only logged days.
- Generated breakfast/chicken photos are explicitly labeled **meal illustrations**, not photos of recorded food. Five optimized WebP assets total approximately 225 KB. The shaker hero is used on login and onboarding.
- Inter (body and controls) and Manrope (headings and numbers) are bundled locally in WOFF format with their SIL Open Font License files in `public/fonts/`. Latin and punctuation subsets total 244 KB. Other scripts use the system fallback.
- Login/register/OTP, three-step onboarding, saved-meal cards with search, weight/progress review, and training/rest target editing now share the dark/red visual system. Existing calculations and auth handlers are preserved.
- This is a local preview release, not a deployed update. Included screenshots use illustrative account data with every backend request mocked; production screens use your actual records.

## Run locally on Windows

Extract this ZIP, then open a terminal **in the folder containing `package.json`**. There is no extra project folder inside this ZIP. Use Node.js 22.12+ or 24.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite. Leave the terminal running; Ctrl+C stops it. Use Vite, not Live Server.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

macOS/Linux: use `npm` in place of `npm.cmd`.

Optional `.env.local`:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

The existing defaults are the project's public URL and publishable key. Never put a service-role key, database password, or private SMTP credentials in Vite variables. The app still depends on the existing Supabase RLS policies. Local development writes real account data unless you run the mocked browser tests.

## What's included

- Password inputs have independent Show/Hide controls and reset when switching forms. OTP starts empty after signup, preventing password text from carrying into the verification field.
- Existing OTP signup, sign-in, resend countdown, and session behavior. The email template in `supabase/confirm-signup-otp.html` now matches the dark/red theme, with the same `{{ .Token }}` OTP placeholder.
- Body → activity/goal → review onboarding, with the existing formula explained and recommended/custom starting estimates.
- Consumed, target, remaining/over values for calories and all macros; stable protein red, carbs blue, fat yellow colors.
- Repeat foods log with one tap from Recent/Frequent. On mobile: `+` → food = two taps. The serving and destination meal are shown first. Use Search/manual entry for a different serving; logged entries remain editable.
- Mobile logging sheet (search, recent, frequent, saved), bottom navigation, and a compact summary that appears after scrolling past the full overview.
- Edit quantity, save meal name, copy warning, and calorie-adjustment dialogs with keyboard focus containment, Escape, and focus return.
- Deletes wait five seconds before the database write. Undo cancels that write. Failed deletes restore the row. Leaving/reloading/signing out before the timer fires cancels deletion; an already-started request may finish.
- Copy buttons name the actual source date: the day before the selected date. A session guard blocks repeating the same copy; existing destination entries require an explicit warning.
- Weight logging/updating for the selected date, weekly review, and a weight chart with date/weight axes, target line, seven-weigh-in average, pointer tooltip, keyboard/touch selector and data table.
- A 5% weight-change reminder offers a new estimate. Nothing changes until you explicitly save targets.
- Short CSS motion, animated counters/bars, skeletons, and reduced-motion support. No animation or chart dependency was added.

## Architecture and performance

`Dashboard.jsx` composes smaller components. `useNutritionData` loads data with abort/stale-result protection and paginates server responses; `useMealActions` owns scoped mutations; `useFeedback` and `useUndoDelete` handle notices and delayed deletes. Meal/saved-food/saved-meal/weight mutations update local state from successful writes, avoiding full-history or food-library refetches. Explicit Reload data is available after errors and refreshes remote changes.

Recent/frequent foods use the **90 days ending on the selected date**, not lifetime totals. Progress, TargetEditor, Dashboard and Onboarding are lazy-loaded. The release build's initial JS is about 465 KB (135 KB gzip); dashboard and tab chunks load separately. Total JavaScript grew with the new functionality, so this is not a claim that the entire app is smaller.

## Tests

`npm test` runs the existing nutrition tests plus date, day-type/target, remaining/over, safe repeat-entry payload, meal-time defaults, calculation and friendly-error tests (26 cases, including display names, Android Back, catalog/search and Windows module-naming coverage).

`tests/ui.browser.cjs` is an optional browser regression test. It mocks **all Supabase and Open Food Facts responses**; it does not send real email or modify the live database. It covers signup/OTP/onboarding wiring, repeat logging, scaling, overages, dialog focus, undo and failed-delete recovery, copy guards, saved-meal search/add/delete, weight dates, target review, failed-save cleanup, mobile layout, both themes and reduced motion.

To run it, start Vite in one terminal. In another, use an existing Playwright installation or temporarily install the runner without changing the manifest/lock:

```powershell
npm.cmd install --no-save --package-lock=false playwright
npx.cmd playwright install chromium
node tests/ui.browser.cjs
```

The browser test defaults to `http://127.0.0.1:5180`; set `TEST_BASE_URL` to your Vite URL first, for example in PowerShell:

```powershell
$env:TEST_BASE_URL = "http://127.0.0.1:5173"
node tests/ui.browser.cjs
```

`CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` are optional overrides for existing browser/test-runtime installations. These are test tools, not production dependencies.

## Database and behavior limits

No schema, RLS, or auth flow changes are required or applied. Existing SQL files are preserved.

- Training/rest date overrides are browser/account-specific and do not sync across devices; the UI says so.
- The weight-change reminder baseline is browser-specific. If no known baseline matches the current targets, the UI explicitly compares with the first recorded weight instead of claiming it knows the weight when targets were set.
- Onboarding and saved-meal creation still span multiple database writes. Saved-meal creation and save-food logging attempt compensating cleanup on failure and explain any cleanup failure. This is not a database transaction. An interrupted response can leave an uncertain save; check the log before retrying.
- Copy guarding is a frontend safeguard, not cross-device atomic deduplication. Two simultaneous devices may still copy the same meals.
- Charts/history and libraries paginate network reads but still retain the returned data in memory. Very large histories may need a separate server aggregation design later.
- Other devices' changes appear on refresh or explicit Reload data; this release adds no real-time subscriptions.
- Open Food Facts is an external service. Fonts are served locally. Manual logging and system-font fallbacks remain available when they cannot load. Nutrition values are estimates.

## Before publishing: real-account checks

1. Fresh signup → real email OTP → invalid/expired code → resend → successful verification. Check the cooldown after refresh and registered-email response.
2. Complete onboarding on a fresh user, refresh and sign in again. Confirm profile, goals and initial weight saved under that user.
3. Use two separate accounts to validate RLS isolation for meals, foods, saved meals/items, weights and targets, including returned rows from inserts and deletes.
4. Log/edit a food, save reusable food, save/add/delete a meal, undo before five seconds, and allow one deletion to finish. Refresh to verify the stored results.
5. Copy from an actual prior date, cancel/accept the existing-items warning, and try a repeat click. Check behavior with a second device.
6. Log/edit weight on an older selected date. Verify axes, target and seven-weigh-in average; review a proposed target update without accepting it.
7. Check mobile keyboard/scroll behavior, light/dark themes, reduced motion, screen-reader navigation, and slow/offline/error recovery.

## Netlify

The supplied `netlify.toml` uses `npm run build`, publishes `dist`, and includes the SPA fallback. Test locally first. Keep a backup of the current site and preserve your repository's `.git` directory when replacing source files. For a manual static deployment, upload only the generated `dist` directory. This package has not been deployed and no production database was changed during development.

## Reproduce the design screenshots (optional)

Use the same browser runner described above. Set `DESIGN_PREVIEW=1` before running it. This seeds illustrative account records inside the test harness only, captures dashboard, login/register/OTP, onboarding, saved meals, progress, targets and OTP email previews, and checks 320, 390, 768, 1024, 1280 and 1536 px widths. It has no production demo mode and does not contact Supabase.

```powershell
$env:DESIGN_PREVIEW = "1"
node tests/ui.browser.cjs
Remove-Item Env:DESIGN_PREVIEW
```

## Update the signup email theme

Open the Supabase project's Authentication → Email Templates → Confirm signup. Copy all of `supabase/confirm-signup-otp.html` into the template body and save. Suggested subject: **Your ZolNutrition verification code**. Keep `{{ .Token }}` exactly as written. This is a presentation update; no SQL, RLS or auth configuration changes are needed. The ZIP does not update the hosted email automatically.

The template uses inline styles, table layout, fallback fonts and an Outlook fixed-width wrapper, with no external image/font downloads. Browser previews use dummy codes; verify actual delivery, dark mode and layout in Gmail/Outlook with a real signup and resend. No real email-client rendering test was performed.

## Typography and interaction polish — 2026-10-04

- Replaced condensed typography with Inter and Manrope, shared font tokens, revised heading sizes and tabular numbers.
- Food suggestions use two lines with a dedicated centered add icon. Fixed the logger header icon padding, aligned macro bars, and anchored saved-meal actions to the bottom of their cards.
- Tablet widths use two workspace columns; mobile controls remain at least 44px.
- Added a sliding food-source indicator, brief source-content/panel entrances, and pointer-only row hover/plus rotation. Existing number, bar, dialog and toast motion remains. Reduced-motion preference disables animations and transitions.
- No animation library or other production dependency was added. Email HTML retains its email-safe fallback font stack; this app update requires no Supabase action.

## Expanded food search — 2026-10-04

Search now defaults to **Basic foods**, with 4,882 USDA SR Legacy reference foods, category and preparation filters, and instant local matching. Try `chicken breast cooked`, `steak cooked`, `tilapia`, `bangus`, `monggo`, or `kanin`. Select an entry, set Amount (g), and log. Selection also works through Food name suggestions. A selected source entry exposes its full description and source link; nutrition scales from its stated serving size.

Choose **Packaged / brands**, enter a product name, then press **Search products** for worldwide Open Food Facts results. This fixes the previous use of v2 text search (which ignored the keyword). The endpoint now supports keyword search; English names are used when available. Local basics remain usable when that service fails. Records with missing core macro values are omitted.

See FOOD_DATA.md for sources, limitations and reproducible generation. The catalog adds about 140 KB gzip as a separate data chunk; it is not part of the initial JS. No API keys, migrations, RLS or authentication changes are required. Existing foods, entries and personal saved items remain in Supabase.


## Android

Capacitor Android is configured as ZolNutrition (`com.zolnutrition.app`). See [ANDROID.md](ANDROID.md) for installation, backend requirements, limitations and rebuild instructions. `npm run android:debug` creates `outputs/ZolNutrition-debug.apk`. Web/Netlify builds still work. PWA installation and offline synchronization are not implemented.

## Brand icons

The supplied Z/leaf artwork is configured as an ICO/PNG favicon and a 180px Apple touch icon. `public/icons/` includes 192/512px Android web icons and a 1024px master. These assets do not add a PWA manifest, service worker or offline support.

After deploying, refresh the browser tab. On iPhone, add the HTTPS site through Safari → Share → Add to Home Screen. If an existing shortcut keeps the old icon, remove and re-add it. Native Android launcher/splash assets are updated in the source; rebuild with `npm.cmd run android:debug` to include them. The previously delivered APK contains the earlier icon.

## Display names and feedback — 2026-10-06

Registration now asks for a display name alongside the existing full name and username. The display name is saved in Supabase Auth `user_metadata.display_name`; no table, RLS, trigger or email-template update is needed. It is presentation-only and must never be used for authorization. Existing users fall back to metadata `full_name`, then `username`, or “Welcome back” when neither exists. Names are trimmed, repeated whitespace is collapsed, and the limit is 50 characters. Email addresses are not used as a fallback.

Use the **Account settings** person icon in the header to set or edit your display name. The editor keeps your draft after a failed save; Save name retries that metadata update. Closing with an unsaved edit asks whether to discard it. Saving updates the signed-in session through Supabase's existing auth event; it does not reload goals or erase the selected date/tab. Sign in again or refresh the session on another device to retrieve updated metadata. Names are not unique account identifiers.

Shared success toasts dismiss after 3.5 seconds. Errors are deduplicated by message and remain until individually dismissed; a later success does not erase them. Errors in the food sheet or quantity/name editor render inside that dialog, with one visible copy. Reload data is an explicit read retry/reconciliation action; writes are not automatically repeated. Existing five-second Undo deletes, keyboard focus containment, Escape, focus return and reduced-motion behavior are preserved. The following selective SweetAlert2 update replaces the decision dialogs; routine feedback remains custom.

Additional mocked browser check: set `PROFILE_CHECK=1` before running `tests/ui.browser.cjs`. Covers legacy/nameless accounts, metadata editing and preservation, save failure/retry, draft discard, refresh persistence, success/error lifetimes and 320–1280px layouts. The normal browser regression now also checks display-name signup → empty OTP → onboarding → personalized greeting.

Before deployment, verify real signup/OTP/resend with a display name, edit a legacy account's name, refresh/sign out/in and check persistence, and confirm two accounts cannot affect each other's metadata/data. Test name-editor focus, keyboard/scrolling and notifications in iPhone Safari and the Home Screen window. Automated tests mock Supabase and do not prove live delivery or RLS. No deployment or APK rebuild was performed for this update; run the existing Android sync/build commands when ready to update that separate APK.

## Account settings and SweetAlert2 — 2026-10-06

The standalone name-edit button is removed. The header's Account settings icon opens a compact name editor; greeting, registration metadata and legacy fallbacks are unchanged.

SweetAlert2 11.26.25 is pinned and loads on demand (about 48 KB / 16 KB gzip). It handles unsaved-name discard, the populated-meal copy warning, saved-meal naming (trimmed, required, 60-character limit), and the optional calorie-adjustment confirmation. The existing targets-load error's Retry button opens a recovery decision; confirming retries only the read. Cancelling leaves the error available. No mutation is automatically retried.

Complex editors and the food sheet stay custom. When a decision opens from Account settings, the native editor is temporarily closed and hidden, then restored with its draft and focus if cancelled. Only one decision can open at a time. Android Back closes the decision before an underlying editor or screen; Escape and focus return are supported. Dialog colors follow light/dark tokens, and reduced motion disables effects. Success toasts and five-second Undo remain unchanged; ordinary errors stay dismissible and persistent.

Run the existing browser runner with `ALERT_CHECK=1` for decision focus, cancellation, safe read recovery, mobile widths, both themes, reduced motion, meal-name validation and calorie adjustment. `PROFILE_CHECK=1` covers Account settings and name persistence; the default runner covers registration/OTP and meal workflows. These are mocked Chromium checks. Real email OTP/resend, metadata persistence across real sessions/accounts, iPhone Safari/Home Screen focus and keyboard scrolling, and physical Android Back still require device/account testing. No deployment or APK rebuild was performed.

## Duplicate username handling — 2026-10-07

The supplied live log identified `profiles_username_unique` (SQLSTATE 23505) during signup. Registration now checks username availability before signup when the optional RPC is installed. Taken usernames show “Username already taken. Choose another.” and preserve the form; signup, OTP and cooldown are not started. Leading/trailing whitespace is removed, and availability checks compare names without case differences. Display names remain non-unique.

To enable that precheck on the existing backend, open Supabase SQL Editor and run **supabase/V6_REGISTRATION_USERNAME_CHECK.sql** once. It adds one read-only boolean RPC callable by anon/authenticated. It changes no tables, existing constraints/indexes, triggers or RLS policies and returns no profile rows, emails or user IDs. Its function owner must be the trusted SQL Editor database owner. No hosted SQL was applied during this update.

If the optional function is absent, registration continues through the existing signup path. Generic Auth database failures now give useful registration guidance without falsely asserting that every server failure is a duplicate username. The existing unique constraint remains authoritative; prechecks do not reserve a username, so simultaneous signups can still race. Unrelated check failures stop signup and ask the user to try again. No signup write is automatically retried.

`REGISTRATION_CHECK=1` runs mocked duplicate/mixed-case checks, preserved fields/password masking, generic server failure, missing-function fallback, and the empty OTP transition. After installing the SQL, manually test `mojxd`, `Mojxd`, an available username and a different existing name with a fresh email. Verify duplicate attempts create no new account/email, then complete real OTP/onboarding for an available name. Supabase remains the source of truth; live RPC permissions/schema behavior still require this manual check.
