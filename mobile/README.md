# Haccora native apps

This Expo/React Native application produces native iOS and Android binaries and uses the same Supabase tenant/RLS contract as the web application. Auth sessions and queued evidence are stored with the platform secure store. Checks, temperatures, corrective actions, incidents and document evidence carry tenant context plus idempotency keys and remain queued when a device is offline. The app includes biometric lock, privacy actions, queue visibility and persisted sync-conflict handling.

1. Copy `.env.example` to `.env` and add the publishable Supabase values.
2. Use Node.js 22.13 or newer, run `npm ci`, then `npx expo start` for development.
3. Replace `SET_WITH_EAS_INIT` by running `npx eas init` in the final Expo account.
4. Test camera/photo/document denial, biometric fallback, notifications, offline termination/reconnect and duplicate submission on real iOS and Android devices.
5. Run `npm run build:ios` and `npm run build:android` after Apple/Google signing, privacy declarations, screenshots, support URLs and store metadata are complete.

Never place the Supabase service-role key in this app. Store submissions still require the legal account owner to accept Apple and Google agreements and provide signing credentials.
