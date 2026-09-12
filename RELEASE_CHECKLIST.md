# RELEASE_CHECKLIST.md

Do not consider GetYourExtra release-ready until every item below is checked **and**
`TEST_ON_DEVICE.md` has passed on real hardware. This checklist alone is not a substitute
for real-device QA.

## Branding & Assets

- [ ] Replace `assets/icon.png` (currently a solid brand-color placeholder) with final
      app icon artwork
- [ ] Replace `assets/adaptive-icon.png` with final Android adaptive icon foreground
- [ ] Replace `assets/splash.png` with final splash screen artwork
- [ ] Confirm icon renders correctly at all required sizes (App Store/Play Store
      generate these automatically from the source file, but verify visually)

## App Identity

- [ ] Confirm final Android application ID (currently placeholder `com.getyourextra.app`
      in `app.json` → `android.package`)
- [ ] Confirm final iOS bundle identifier (currently placeholder `com.getyourextra.app` in
      `app.json` → `ios.bundleIdentifier`)
- [ ] Confirm `app.json` → `version` matches the intended store-listed version
- [ ] Set/confirm Android `versionCode` and iOS build number before each submission (EAS
      can auto-increment these if configured)

## Legal & Store Requirements

- [ ] Publish and link a real Privacy Policy URL (none is hosted yet — this is a
      placeholder gap, not a hidden bug)
- [ ] Publish and link a real Support URL / contact
- [ ] Publish Terms of Service if required by your distribution model
- [ ] Confirm in-app "Privacy" text in Settings accurately reflects the published policy
      wording (it currently states local-only storage, which is factually accurate for V1)
- [ ] Decide and document pricing/subscription model if one is ever added — V1 as built
      has no payment processing and no in-app purchases

## Store Listings

- [ ] Prepare App Store screenshots for required device sizes
- [ ] Prepare Google Play screenshots for required device sizes
- [ ] Write App Store / Play Store description, keywords, and category
- [ ] Prepare feature graphic (Play Store) and promotional assets as needed

## Permissions

- [ ] Confirm camera and photo-library permission strings in `app.json` read naturally
      and accurately describe why the app needs them (already written; re-review before
      submission in case Apple/Google guidance changes)
- [ ] Confirm no unused/extra permissions are declared

## Signing & Build

- [ ] Configure production signing via `eas build:configure` (Android keystore, iOS
      provisioning profile / distribution certificate)
- [ ] Run `eas build --platform android --profile production`
- [ ] Run `eas build --platform ios --profile production`
- [ ] Confirm both production builds install and launch on a real device before
      submitting

## Functional QA (see TEST_ON_DEVICE.md for detail)

- [ ] Full `TEST_ON_DEVICE.md` checklist passed on at least one Android device
- [ ] Full `TEST_ON_DEVICE.md` checklist passed on at least one iOS device
- [ ] PDF generation QA (no logo, logo, 0/1/many photos, multi-page, CAD, USD) passed
- [ ] Offline QA (airplane mode create/price/sign/PDF) passed
- [ ] Database migration QA: confirm `initDatabase()` runs safely and idempotently on an
      app that already has existing local data from a prior build
- [ ] Backup/export expectations: confirm none are promised anywhere in-app or in store
      copy, since V1 has no export/cloud backup feature

## Stability & Accessibility

- [ ] Basic crash test: rapidly navigate through onboarding → wizard → back → wizard again
      without crashes
- [ ] Basic crash test: deny every permission prompt and complete a full New Extra flow
      using only manual price entry and no photos
- [ ] Accessibility sanity check: confirm buttons have adequate touch target size, text
      contrast is readable outdoors, and screen reader can reach primary actions
      (VoiceOver / TalkBack spot check, not a full audit)

## Final Legal Review

- [ ] Have the disclaimer text in company setup / PDF footer note reviewed by the
      business owner or counsel before shipping to real customers — GetYourExtra ships a
      reasonable default disclaimer but does not provide legal advice
- [ ] Confirm no store-listing copy overstates capabilities (e.g. do not claim "cloud
      backup," "team accounts," or "payment processing" — none exist in V1)
