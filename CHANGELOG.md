# Changelog

## Duplicate username signup feedback — 2026-10-07

- Added optional username availability precheck and preserved form data on duplicate rejection.
- Added honest registration-specific handling for generic Auth database failures.
- Supplied V6 boolean RPC SQL; no tables, RLS, existing uniqueness rules or triggers changed. Hosted installation remains manual.
- Added unit and mocked browser coverage; preserved OTP/password controls, name settings, SweetAlert2, toasts and Undo.

## Account settings and selective SweetAlert2 — 2026-10-06

- Moved name editing to a header Account settings dialog, retaining the greeting and signup metadata.
- Added themed, lazy-loaded SweetAlert2 for discard, populated-meal copy, saved-meal naming, calorie adjustment and target-load retry decisions.
- Added single-dialog coordination, focus/draft restoration, Android Back priority and reduced-motion styling.
- Kept routine toasts, persistent errors, Undo and all existing write/auth flows. No database, RLS, deployment or APK changes.
- Expanded browser checks and Android Back tests; updated README/AUDIT.

## Display names and feedback — 2026-10-06

- Added signup display-name metadata, personalized dashboard greeting and an editor for existing accounts, with full-name/username fallbacks.
- Added draft-discard confirmation and kept failed name edits available for retry.
- Success toasts dismiss after 3.5 seconds; errors persist independently, deduplicate and appear once inside open mutation dialogs.
- Preserved five-second Undo, OTP flow, previous icon/mobile fixes and existing functionality.
- Added name/feedback browser coverage and two display-name unit tests; updated documentation. No schema, RLS, dependency, deployment or APK changes.

## Brand icon — 2026-10-06

- Added the supplied Z/leaf artwork as ICO/PNG favicons and an Apple touch icon.
- Added web icon sizes and updated Android launcher/splash source assets.
- Kept existing UI and account behavior; no PWA/offline implementation or APK rebuild in this update.

## Android conversion — 2026-10-05

- Added pinned Capacitor dependencies, Android project and debug-build script.
- Bundled existing web assets; added themed vector icon/splash and keyboard/inset handling.
- Added Back routing for dialogs, tabs, auth and onboarding; root minimizes.
- Preserved Supabase calls, schema and RLS. Added Android documentation and back-routing tests.

## Registration and mobile-date fixes — 2026-10-05

- Remount auth forms on mode changes so passwords cannot carry into the visible OTP input.
- Added independent, accessible Show/Hide controls for login, signup and confirmation passwords.
- Constrained the native date input and its WebKit internals to its mobile grid column.
- Extended mocked signup checks for visibility toggles and an empty OTP field.
- Reverified existing fixes on request; documented PWA versus Capacitor options without adding packaging.

## Meal-list polish — 2026-10-05

- Matched meal rows to the shared theme with clearer typography, tinted macro chips, pencil/trash icons and a subtle red delete control.
- Removed header-only padding from entry actions; controls align on desktop and move below food details in narrow panels.
- Preserved visible action labels, accessible names, 44px hit areas and existing edit/delete/undo handlers.

## Windows development fix — 2026-10-04

- Renamed the food-search helper to foodSearchUtils.js and made the component import explicit. This prevents Windows resolving FoodSearch to the helper instead of FoodSearch.jsx.
- Added a cross-platform module-naming regression check.

## Basic-food catalog and search fix — 2026-10-04

- Added 4,882 sourced USDA reference foods with category/raw/cooked filters, familiar aliases and source details.
- Basic foods now come first; personal library suggestions and per-gram scaling remain available.
- Fixed Open Food Facts keyword lookup, preferred available English names and added explicit search submission, cancellation, caching and request spacing.
- Omitted packaged products with incomplete core macros.
- Added catalog/search/scaling tests and reproducible data generation/source documentation.
- No database/auth changes or new dependencies.

## Typography, alignment and motion — 2026-10-04

- Switched to locally hosted Inter and Manrope, with consistent heading scale and aligned numeric values.
- Fixed logger plus-button alignment and separated food names, serving details and add icons.
- Aligned macro bars, saved-card actions and responsive workspace columns.
- Added sliding source tabs, subtle panel entrances and pointer hover feedback with reduced-motion support.
- Passed 11 tests, build and mocked browser/layout checks. No database, auth or dependency changes.

## Full design preview and OTP email — 2026-10-03

- Matched login, registration, OTP and onboarding to the dark/red theme.
- Added saved-meal search and expandable food details; redesigned Progress and training/rest Targets.
- Added compact date context on secondary tabs and responsive mobile layouts.
- Updated the signup OTP email HTML, preserving `{{ .Token }}` and the existing verification flow.
- No new dependencies, database/RLS changes or production deployment.
- Passed 11 unit tests, build, mocked browser regression and six-width screen/email checks. Real-email delivery and email-client rendering remain manual checks.

## Dashboard design preview — 2026-10-03

- Reworked desktop navigation into a sidebar; retained mobile bottom tabs and quick logging.
- Added a mountain calorie card, three macro cards, seven-day intake and compact weight/target panels.
- Restyled logged meals and repeat-food controls; labeled generated food thumbnails as illustrations.
- Included five optimized WebP assets and locally served licensed Barlow fonts. Used the shaker hero in the following login/onboarding redesign.
- Kept auth, database, queries and mutations intact; added no production dependencies.
- Passed 11 unit cases, production build, full mocked browser regression and six-width design checks. The remaining screens are completed in the following release.


## PlateLog improvements — 2026-10-03

### Phase 1 — Bugs and gaps

- Added truthful consumed/target/remaining and over-target displays.
- Replaced browser prompts/confirms with accessible dialogs; added five-second undo deletes.
- Guarded repeat copying and labeled the actual source date.
- Enabled selected-date weigh-ins, compensating save-food cleanup, and 90-day frequent foods.
- Prevented old IDs/ownership/timestamps leaking into repeat-food inserts.
- Added friendly errors, retry, error boundary, StrictMode, and browser-only override notice.
- Existing unit tests and production build passed.

### Phase 2 — Workflow

- Added two-tap mobile repeat logging, time-based meal defaults, bottom sheet, bottom navigation, and scrolling summary.
- Added three-step onboarding, goal cards, calculation explanation and recommended/custom actions.
- Added opt-in target review after significant weight change, meaningful empty states and notices.
- Added accessible weight chart axes, target line, seven-weigh-in average, tooltip/selector and data table.
- Unit tests, production build and mocked browser smoke checks passed.

### Phase 3 — Motion and styling

- Centralized color/spacing/radius/motion tokens and kept Barlow fonts and dark default.
- Added animated counters, accessible macro bars, reached/over states, tab indicator, row entrances/collapse, dialogs, sheets, notices, skeletons and press states.
- Every animation and transition respects reduced motion.
- Unit tests and production build passed.

### Phase 4 — Performance and quality

- Split Dashboard into data/actions hooks and focused components; lazy-loaded Progress, Targets, Dashboard and Onboarding.
- Updated state from successful writes instead of refetching whole libraries/history.
- Added paginated, abortable reads, memoized expensive chart/food derivations, labels, focus rings and mobile touch sizing.
- Expanded to 11 unit cases and a reusable mocked browser regression test.
- Clean dependency install, unit tests, production build and browser regression checks passed.

No production dependencies, database/RLS changes, or auth behavior changes. No live deployment. Real-email delivery and RLS still require real-account testing.
