# KNOWN_LIMITATIONS.md

This document lists real, intentional V1 scope limitations and genuine environment
constraints from the build process. It does not hide bugs — any bug found during
development was fixed, not documented around.

## Intentional V1 Scope Limitations

These are deliberate per the product specification, not oversights:

- **No cloud sync or backup.** All data lives in a local SQLite database and local files
  on a single device. Uninstalling the app or losing the device means the data is gone.
- **No team accounts / multi-user access.** GetYourExtra is single-user, single-device in
  V1.
- **No online/remote signature link.** Approval requires physically handing the phone to
  the approver; there is no email-a-signature-link flow.
- **No payment processing.** "Mark Paid" is a manual record-keeping action; no money
  actually moves through the app.
- **No accounting system integration** (QuickBooks, etc.) — this is intentionally out of
  scope per the product principle of staying focused on change-order recovery.
- **No project-management features** — no scheduling, task boards, messaging, or
  workforce tracking, by design.
- **No data export/backup file.** Settings explains where data lives but does not offer
  an export-to-file action in V1.
- **Declined status exists in the data model** (for forward compatibility with the status
  helper logic) but the current UI does not expose a way to mark a change order Declined;
  only Draft → Sent → Approved → Paid are reachable from the UI in V1.

## Environment Constraints From This Build

The environment this project was built in has **no network access** and cannot run a
mobile runtime. As a direct result:

- `npm install` was never executed here; dependency versions were chosen carefully for
  Expo SDK 51 compatibility but were not resolved/installed and could theoretically
  surface a version-resolution conflict that only appears once real installation happens.
- The Expo/Metro bundler was never started; the app was never actually launched in a
  simulator, emulator, or physical device from this environment.
- Camera capture, photo library access, image compression, the signature WebView, PDF
  rendering, native sharing, and real device force-close/persistence were **never
  exercised in a real runtime** — they were implemented, reviewed line-by-line, and
  statically verified (syntax parsing with the TypeScript compiler, route/import
  cross-referencing, and strict type-checking of every dependency-free logic module), but
  not executed end-to-end. See `TEST_ON_DEVICE.md` for the exact manual checklist needed
  to close this gap.
- Full-project `tsc --noEmit` (including React Native/Expo ambient types) could not be
  run, because the required `node_modules` type declarations are not present without
  `npm install`. What **was** verified: all 38 `.ts`/`.tsx` files parse with zero syntax
  errors under the TypeScript parser, and the five dependency-free logic modules
  (`money.ts`, `calc.ts`, `coNumber.ts`, `statusHelpers.ts`, `formatters.ts`) pass a full
  `--strict` type-check in isolation.

None of the above are hidden defects — they are the honest boundary between what static
analysis and pure-logic unit testing can confirm, and what only a real device run can
confirm.
