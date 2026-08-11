# Native store release checklist

- [ ] Run `eas init`, store the real project UUID as protected `EAS_PROJECT_ID` and run `npm run release:preflight` with the production `EXPO_PUBLIC_*` values.
- [ ] Configure Apple team, App Store Connect application, Google Play application and least-privilege submit credentials outside Git.
- [ ] Complete App Store privacy, export-compliance and Google Play Data safety declarations against `PRIVACY_DATA_MAP.md` and the production SDK inventory.
- [ ] Add reviewed UK English store descriptions, keywords, support/privacy URLs, category, age rating and current device screenshots.
- [ ] Build signed iOS and Android production candidates from the exact approved commit.
- [ ] Exercise sign-in, sign-out, offline capture/replay, attachments, camera denial, notification denial, biometric fallback, deep links and account/privacy requests on representative physical devices.
- [ ] Install and approve the same signed candidates through TestFlight and Play internal testing.
- [ ] Record build identifiers, tester results, reviewer notes, approvals, phased-release plan and rollback owner in the private release evidence.
