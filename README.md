# GetYourExtra

**Extra work. Document it. Approve it. Get paid.**

GetYourExtra is an offline-first mobile app for contractors and subcontractors (electrical,
plumbing, HVAC, roofing, drywall, painting, flooring, concrete, carpentry, and other trades)
to document work performed outside the original contract scope, price it, capture photo
evidence, get a signed approval on the spot, generate a professional PDF change order, and
track payment — all in under a minute, from a phone, on a job site with no signal.

## Tech Stack

- **Expo SDK 51** + **Expo Router 3** (file-based navigation)
- **TypeScript**, strict mode
- **expo-sqlite** — local relational database (company, jobs, change orders, line items,
  photos, approvals, payments)
- **expo-print** — HTML-to-PDF change order generation
- **expo-sharing** — native share sheet
- **expo-image-picker** + **expo-image-manipulator** — camera/library photo capture and
  compression
- **react-native-signature-canvas** (+ **react-native-webview**, its runtime dependency) —
  on-screen signature capture
- All money math runs through a single tested integer-cents calculation engine
  (`src/lib/calc.ts`, `src/lib/money.ts`) — never floating point, never duplicated in a
  screen component.

## Requirements

- Node.js 18 LTS or newer (20 LTS recommended)
- npm 9+
- Expo CLI (installed automatically via `npx`)
- **Android**: Android Studio with an emulator, or a physical Android device with the
  Expo Go app / a dev-client build
- **iPhone**: a Mac with Xcode, or a physical iPhone with the Expo Go app / a dev-client
  build

## Install

```bash
npm install
npx expo start
```

If you hit a stale bundler cache after pulling changes or switching branches:

```bash
npx expo start --clear
```

### Why Expo Go may not be enough

This app uses `react-native-signature-canvas`, which depends on `react-native-webview`.
On recent Expo SDKs this typically still works inside **Expo Go**, but if you see the
signature pad fail to render or a "native module not found" error, build a custom
**development client** instead:

```bash
npx expo install expo-dev-client
npx expo run:android    # or: npx expo run:ios
```

## Android Development

**Expo Go (fastest path):**

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your Android device.

**Development build (if Expo Go shows native module errors):**

```bash
npx expo run:android
```

Requires Android Studio + an emulator, or a device connected via USB with debugging
enabled.

## iPhone Development

**Expo Go:**

```bash
npx expo start
```

Scan the QR code with the Camera app (which hands off to Expo Go) or the Expo Go app
directly.

**Development build (Mac + Xcode required):**

```bash
npx expo run:ios
```

## EAS Build (App Store / Play Store builds)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

This will not assume you have Apple/Google credentials configured; `eas build:configure`
walks you through connecting an Expo account and, for iOS, an Apple Developer account.

**Android test/preview build (installable APK):**

```bash
eas build --platform android --profile preview
```

**Android production build (AAB for Play Store):**

```bash
eas build --platform android --profile production
```

**iOS build:**

```bash
eas build --platform ios --profile production
```

You will need an active Apple Developer Program membership for iOS distribution builds;
`eas build` will prompt for the required signing credentials.

## Local Data — Where Everything Lives

GetYourExtra is **offline-first and local-only in V1**. There is no server and no cloud
sync.

- **Structured data** (company profile, jobs, change orders, line items, approvals,
  payment records) lives in a single SQLite database file on-device, managed by
  `expo-sqlite` (`src/db/client.ts`, `src/db/repositories/*`).
- **Photos** captured or selected in the New Extra flow are compressed
  (`expo-image-manipulator`) and copied into the app's private documents directory.
- **Signatures** are captured as PNG images (via `react-native-signature-canvas`) and
  written to the same private documents directory.
- **Generated PDFs** are rendered with `expo-print` and saved into the same documents
  directory, named like `CO-0008-Smith-Residence-742.50.pdf` (see `src/lib/pdf.ts` for the
  filename-sanitization logic).

None of this data leaves the device unless the user explicitly taps **Share** on a
generated PDF, which hands the file to the OS-native share sheet.

## Permissions

- **Camera** — used only when the user taps "Take Photo" while documenting an extra.
- **Photo Library** — used only when the user taps "Choose Existing" to attach existing
  photos, or when setting a company logo.
- No location, contacts, microphone, or background permissions are requested. No GPS
  metadata is captured or fabricated.

## Troubleshooting

**"Unable to resolve module @/..." / path alias errors**
Confirm `babel.config.js` includes the `module-resolver` plugin with `alias: { "@": "./src" }`
and that `babel-plugin-module-resolver` is installed (`npm install`), then clear the cache:
`npx expo start --clear`.

**Metro bundler cache issues after pulling changes**
```bash
npx expo start --clear
rm -rf node_modules && npm install
```

**Signature pad renders blank or WebView error**
Confirm `react-native-webview` is installed (it's a runtime dependency of
`react-native-signature-canvas`, not just a peer). If it still fails in Expo Go, build a
development client (see Android/iPhone sections above).

**Photo picker permission dialog never appears / picker silently fails**
On some Android OEM skins, the permission prompt is suppressed after a prior denial.
Direct the user to the device's system Settings → Apps → GetYourExtra → Permissions.

**PDF won't share / "Sharing unavailable"**
`expo-sharing` requires the native share sheet, which isn't available in some simulator
configurations. Test PDF sharing on a physical device or a simulator with Mail/Files
configured.

**Database appears empty after a fresh reinstall**
Expected — this is normal, offline-only, on-device storage with no cloud sync. There is
no account system and no backend to restore from (see `KNOWN_LIMITATIONS.md`).

**Resetting local data during development**
`src/db/client.ts` exports `resetDatabaseForTesting()`, which drops and recreates every
table. It is never called by the shipped UI — only wire it up temporarily from a dev
screen or a one-off script if you need to clear local data while developing.
