# ZolNutrition audit

This audit applies to the uploaded React PlateLog source and the four requested phases. All files in src/, README and the prior audit were read before editing.

| Finding                                                  | Resolution                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Macro progress clamped away overage                      | Explicit consumed, target, remaining/over values and accessible bar value text                                                      |
| Native prompt/confirm and incomplete edit focus handling | Shared modal dialog with inert background, focus containment, Escape and focus return                                               |
| Blocking deletes                                         | Deferred database delete with five-second undo and failure restoration                                                              |
| Repeated copy could duplicate food                       | Synchronous mutation guard, session copy key and destination re-read/warning; actual source-date labels                             |
| Weight restricted to today                               | Selected-date upsert and prefill for existing weigh-in                                                                              |
| Save food followed by failed entry left an orphan        | Compensating food delete; clear uncertainty/cleanup error if recovery fails                                                         |
| Saved-meal parent/items partial failure                  | Compensating parent deletion, with explicit cleanup failure notice                                                                  |
| Recent/frequent only covered 14 days                     | Paginated 90-day window ending on the selected date                                                                                 |
| Repeat-food prefill leaked an existing entry ID          | Explicit insert payload whitelist                                                                                                   |
| Backend errors exposed implementation details            | Friendly error mapping and explicit data reload; writes are never blindly auto-retried                                              |
| Browser-only day settings were not explained             | Limitation displayed beside the switch                                                                                              |
| Broad repeated imports and monolithic Dashboard          | Focused components/hooks, cleaned imports, error boundary and StrictMode                                                            |
| Expensive refetches after successful writes              | Local insert/update/delete state changes; foods load only on account change or explicit reload                                      |
| Bare chart and today-only logging                        | Accessible chart with real date spacing, axis labels, target, rolling average, tooltip/selector and data table                      |
| No weight-based reminder to review targets               | Optional 5% reminder, explicit estimate/review/save flow and disclosed local baseline                                               |
| Limited motion/accessibility                             | Central tokens, reduced-motion support, native-modal background inertness, 44px mobile controls, visible focus, light/dark contrast |

## Verification

- npm test and npm run build completed after each phase.
- 11 unit cases cover original nutrition calculations plus date boundaries, day types/targets, zero targets, remaining/over, safe payloads, time defaults, shared onboarding calculation and error mapping.
- Mocked browser regression covers signup → OTP → fresh onboarding, repeat logging, edit/scaling, overage, keyboard containment/Escape/focus return, undo and deletion failure, copy cancellation/guard, saved meals, selected-date weight, optional target review, failed meal save with compensating cleanup, Open Food Facts, mobile sizing, both themes and reduced motion. No page runtime errors in these flows.
- No tests sent email or wrote to the live Supabase project. Mocked RLS-shaped failures verify UI handling, not actual database policies.

## Deliberate limits

- No schema or RLS edits; browser-only day overrides are disclosed rather than adding a migration.
- No Chart.js or animation dependency: custom SVG and CSS cover the requested interactions.
- No cross-device atomic copy guarantee, transactional onboarding, real-time sync, or offline writes. Existing schema cannot provide these guarantees from frontend code alone.
- No barcode scanner, export or unrelated features were added; the work stays focused on daily targets, consumption and remaining food.
- Total JavaScript increased with the new functionality. Lazy loading reduces the initial chunk, and further chunks load on demand; it is not a claim that the whole release is smaller.

See README for known limits and the real-account verification checklist.

## Dashboard design preview — 2026-10-03

- Read current source and prior documentation before changing presentation. Auth handlers, data-loading hooks, database mutations, SQL, RLS and manifests are unchanged.
- Added desktop sidebar, responsive macro cards, local decorative assets, weekly intake and a compact weight/target rail derived from already-loaded records.
- Image assets are labeled illustrations. Missing calorie days stay distinguishable from recorded zero values; the weekly average denominator includes only logged days.
- Bundled licensed Barlow font files for consistent rendering without a third-party font request. Five WebP images are approximately 225 KB; fonts add approximately 210 KB before HTTP compression.
- Fixed a rendering reference error and narrow-screen stat overflow found while developing the preview. Final 11 unit cases, build, and full mocked browser regression pass.
- Design checks passed across six viewport widths, light/dark styling, reduced motion and mobile sheet. Screenshot account values are test fixtures, not live data.
- No production deployment. The dashboard preview was followed by the remaining-screen redesign below.

## Remaining screens and OTP email — 2026-10-03

- Restyled login/register/OTP and three-step onboarding without changing authentication handlers, onboarding calculations or save behavior.
- Added searchable saved-meal cards and actual food details, with explicitly labeled illustrative photos. Existing add/delete/undo behavior is retained.
- Reworked Progress and Targets into responsive panels using existing records, formulas, selected dates and save handlers; no extra network queries or dependencies.
- Other tabs use a compact selected-date context instead of repeating the full dashboard.
- Updated Confirm signup HTML to the dark/red theme. The OTP placeholder remains unchanged; hosted template installation is manual. No database, RLS or auth behavior changes.
- Final unit tests (11), production build, full mocked browser regression and expanded design checks pass. Design checks cover six widths, both themes, reduced motion, mobile controls and email previews with 10-digit code capacity. Browser previews do not certify Gmail/Outlook rendering or real OTP delivery.
- Initial JavaScript: 465 KB / 135 KB gzip, with dashboard/onboarding/progress/targets split into separate chunks.

## Typography, alignment and motion — 2026-10-04

- User requested replacing Barlow: Inter/Manrope are now local licensed fonts (244 KB total Latin/punctuation subsets). Shared CSS font tokens replace repeated family declarations.
- Fixed logger plus-button padding and centered SVGs; two-line repeat-food rows preserve readable names and consistent add-icon placement. Macro bars align across cards, saved-card actions sit at the bottom, and tablet workspace columns widen.
- Source indicator transitions and brief content/panel entrances supplement existing motion. Hover movement is limited to fine pointers; reduced-motion disables animation and transitions.
- The 11 unit tests, production build and mocked browser regression pass. Design checks cover six viewport widths, both themes and reduced motion; screenshots were visually inspected. Auth handlers, calculations, data hooks, SQL and the email template are unchanged.

## Food coverage and search correction — 2026-10-04

- Found the app passed `search_terms` to Open Food Facts v2, which does not support keyword search. Replaced it with explicit CGI text lookup; live `chicken` lookup returned relevant branded products.
- Added 4,882 USDA SR Legacy entries from official downloadable CSVs, with source IDs, original descriptions and complete per-100g nutrients. Food categories and preparation filters distinguish raw/cooked foods. Basic search is local and independent of packaged lookup availability.
- Added aliases, own-library matches, bounded result rendering and source details before logging. Catalog IDs are deliberately separate from Supabase food IDs.
- Online lookup clears stale results, cancels on query/source changes and unmount, has a timeout, caches results and spaces requests. English names are preferred but translation and worldwide completeness cannot be guaranteed.
- Recipe-specific Filipino dishes are not assigned invented generic nutrition. Added oil/sauce and edible-portion instructions are shown in the UI.
- No migrations, RLS/auth edits or production dependencies; raw database tables were not modified.

Validation: all 17 unit tests and production build pass. Full mocked browser regression passes, including USDA selection/scaling and packaged logging. Six-width design checks pass, including basic search and raw preparation filtering; no runtime errors. The separately loaded catalog is approximately 141 KB gzip (1.33 MB uncompressed); Vite reports its large data chunk. Live packaged lookup was checked read-only; no live account writes were performed.

## Windows module resolution — 2026-10-04

Windows development exposed an extensionless resolution collision between FoodSearch.jsx and foodSearch.js. Renamed the helper to foodSearchUtils.js and used explicit extensions for both imports. Earlier Linux builds did not expose this issue. Added a regression check for case-insensitive JS/JSX basename collisions.

Validation: 18 unit tests, production build and Vite development dependency scan/module transformation pass. Actual Windows runtime verification remains with the user.

## Meal-row visual polish — 2026-10-05

Separated entry actions from the meal-header toolbar, removing its misplaced 80px right padding. Added existing-system SVG icons, visible edit/delete labels, a tinted delete state, macro chips and container-responsive action placement. No data/auth handlers, SQL, dependencies or nutrition calculations changed.

Validation: 18 unit tests and production build pass; mocked browser regression covers edit-dialog focus, delete/undo/failure recovery and existing flows. Meal layouts checked at 320, 390, 768, 1024 and 1536px, including long names, 44px action controls, light theme and reduced motion. Desktop/mobile screenshots inspected. The existing lazy USDA data-chunk size warning remains.

## Password-field reuse and mobile date — 2026-10-05

React reconciliation retained the uncontrolled password value when the auth form changed to OTP. Keying the form by mode remounts its fields, clearing password values and resetting visibility. Added independent password controls with explicit labels, pressed state and non-submit buttons. Native date sizing now constrains WebKit internals in the mobile grid. Auth requests, validation, database and RLS behavior remain unchanged.

Validation: 18 unit tests and production build pass. Mocked browser regression checks hidden/revealed passwords and empty OTP after signup. Additional checks cover signup with password shown, returning to sign-in with an empty hidden password, and date/arrow boundaries at 320/390/430/768px. Screenshots inspected. These layout checks use Chromium; actual iPhone Safari date rendering and real OTP delivery still require manual testing.

Follow-up verification: existing fixes retained without rewriting. Re-ran all 18 unit tests, production build, mocked browser regression and mobile date/OTP transition checks successfully. README now documents PWA and Capacitor options; packaging was not implemented. Real Supabase delivery/RLS and iPhone Safari checks remain manual.

## Android conversion — 2026-10-05

Restored the interrupted Android working copy from version-7 web ZIP and recorded conversion changes after the environment reset. Capacitor 8.5.2/App 8.1.2; native inset/keyboard handling, Back routing and build script. 20 unit tests and production build pass. No backend schema/auth/RLS changes. Full mocked browser regression and Android Back/mobile layout simulations pass on the recovered build; actual device and real-account checks remain manual. See ANDROID.md.

Native Gradle assembleDebug and APK signature/package verification passed. Bundled assets match dist byte-for-byte. Debug APK provided; physical Android and real-account checks remain pending.

## Brand icons — 2026-10-06

Converted the user-supplied square artwork to ICO/PNG favicon sizes and an Apple touch icon; added head links and updated native Android launcher/splash source assets. No UI, database or auth changes. Native source uses the same resource names; the previous debug APK still has its earlier icon. This update does not implement a PWA or offline caching. iPhone icon caching/Add to Home Screen remains a physical-device check.

Validation: all 20 unit tests pass. Production build and Capacitor sync pass; favicon link targets, image dimensions, ICO sizes and Android resource XML validate. The icon is not tested on a physical iPhone or rebuilt Android APK.

## Display names and feedback — 2026-10-06

Inspected README/AUDIT, signup/session/onboarding and shared feedback code before editing. Signup already had full-name/username metadata, so display names use Auth metadata rather than a schema migration or an extra profile write. Updates send only `data.display_name`; email, password, full name, username, OTP type and session subscription behavior remain intact. No database/RLS/trigger changes or real-account writes were made.

Added a dashboard greeting with legacy fallbacks and a name editor. It normalizes whitespace, rejects blank/oversized names, preserves draft text after failures and asks before discarding unsaved edits. Rendering uses React text escaping. Metadata is never used as an authorization source.

Feedback now has one replaceable success toast and persistent, individually dismissible, deduplicated errors. Modal mutation errors have one visible location inside the dialog, avoiding background toast/inline duplication. Data reload remains explicit; uncertain mutation responses are never automatically retried. Existing deferred deletes and Undo were retained. Shared modal semantics/focus/reduced-motion remain in use.

Validation: 22 unit tests and production build pass. Full mocked browser regression passes, including signup/name metadata → empty OTP → onboarding, meals/scaling, edit dialogs, Undo/failure recovery, copy guards, targets, weights, food search, mobile, both themes and reduced motion. Physical iPhone and real Supabase delivery/metadata persistence/account isolation remain manual checks. No SweetAlert2, deployment or APK rebuild. Existing large lazy catalog warning remains.

Dedicated profile/browser checks also passed: nameless and legacy accounts, editing with metadata preservation, failed-save retry, draft discard, refresh persistence, success auto-dismiss, errors surviving later success, and no horizontal overflow at 320/390/430/768/1280px. Inspected the mobile greeting screenshot, including a 50-character name.

## Account settings and selective SweetAlert2 — 2026-10-06

Read current README/AUDIT and auth, profile, dialog, mutation and native-navigation code before editing. Removed the standalone Edit name action; a labeled header person icon opens Account settings. Registration metadata, greeting fallback and metadata-only save remain unchanged.

Pinned SweetAlert2 11.26.25. Converted the shared simple-dialog helper, preserving copy guards and saved-name validation, and added discard and target-load recovery decisions. The recovery action retries a read only. No write retry, blocking delete confirmation or routine success popup was introduced. Complex editors, food sheet, persistent errors and Undo remain custom.

One decision is allowed at a time. Native editors are hidden/closed while a decision is active and restored afterward; focus and draft are retained on cancellation. Android Back checks the decision first. Existing Supabase writes, schema, RLS and OTP flow are unchanged. Name data uses React text rendering; SweetAlert titles/messages use text options rather than interpolated HTML.

Validation: 23 unit tests and production build pass. Full mocked browser regression and PROFILE_CHECK pass. ALERT_CHECK covers focus containment/return, Escape, simulated Android Back, non-overlapping native dialogs, read-retry cancellation/recovery, meal-name validation, calorie-adjustment cancellation/acceptance, reduced motion, and 320/390/430/768/1280px layouts in both themes. Mobile popup screenshot inspected. Initial JS is approximately 477 KB (140 KB gzip), with SweetAlert2 in a separate 48 KB chunk. The existing large lazy USDA catalog warning remains.

Manual checks remain: real Supabase signup/OTP/resend, name updates across refresh/sign-in and separate accounts, RLS isolation, iPhone Safari/Home Screen keyboard/focus/scrolling, assistive technology, and physical Android Back. No live-account writes, deployment, native sync or APK rebuild occurred. Existing tooling dependency advisories were not addressed by forcing unrelated Capacitor changes.

## Duplicate signup username — 2026-10-07

User's expanded Postgres log confirmed `profiles_username_unique` / 23505 during signup. Inspected Auth and existing SQL; original trigger definitions were not included. Kept that constraint, profile data, signup trigger, RLS and email OTP behavior intact.

Added an optional, narrowly scoped SECURITY DEFINER boolean availability RPC with a fixed empty search_path and fully qualified table access. Only execute permission is granted to anon/authenticated; profiles are not exposed by a new SELECT policy. Checks use trimmed, case-insensitive usernames, without rewriting existing account names. Added frontend duplicate feedback and optional-function fallback. Generic Auth failures describe possible username conflicts without mislabeling all server failures; concurrent races remain protected by the existing database constraint.

No hosted SQL, account creation, deployment or APK build was performed. The optional SQL file must be installed once for pre-signup rejection; without it the existing backend signup path still works with improved failure messaging. Live permission/schema and duplicate/OTP checks remain manual.

Validation for this update: 26 unit tests and production build pass. REGISTRATION_CHECK passes for trimmed/mixed-case duplicates, no signup call on rejection, preserved form/password masking, generic database failure, missing optional RPC fallback and empty OTP transition. Full mocked browser regression also passes for signup/onboarding, meals, scaling/overages, edit/focus, Undo/failure restoration, guarded copy, saved meals, targets/weights, food search, mobile sizing and reduced motion. RPC SQL has not been executed against the live backend, so its permissions and actual duplicate behavior must be verified after manual installation.
