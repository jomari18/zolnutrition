# Local password recovery verification

`npm test` covers the recovery controller, including proof invalidation, stale responses, validation, and retryable sign-out. The browser test uses the real React screens and Supabase client against a synthetic HTTP provider; it sends no real email and touches no live accounts or nutrition database.

Start the provider in one terminal:

```powershell
node tests/recovery-provider.mjs
```

Start Vite in a separate terminal with the synthetic provider:

```powershell
$env:VITE_SUPABASE_URL='http://127.0.0.1:55502'
$env:VITE_SUPABASE_PUBLISHABLE_KEY='synthetic-public-key'
npm run dev -- --port 5202 --strictPort --host 127.0.0.1
```

Run the browser checks with Playwright CLI:

```powershell
playwright-cli -s=zolnutrition-recovery open http://127.0.0.1:5202
playwright-cli -s=zolnutrition-recovery run-code --filename=tests/password-recovery-cli.js
playwright-cli -s=zolnutrition-recovery close
```

The browser check covers wrong/expired OTP, generic email-request feedback, email edits, resend cooldown, minimum password length, confirmation mismatch, successful save and ordinary sign-in, account changes during recovery, memory-only auth, refresh, interrupted sign-out, duplicate submission locking, and mobile/Android back navigation. Expected synthetic HTTP failures (403, 429 and 500) exercise the error paths.

Stop both local servers after testing. The browser invokes the existing Android back event; this does not replace a test on an installed Android device. Production still needs the Supabase **Reset password** email template to include `{{ .Token }}` so users can enter a code in the app.
