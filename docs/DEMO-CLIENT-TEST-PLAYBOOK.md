# Haccora demo client test playbook

This creates a repeatable, UK-only demonstration business in a **non-production Supabase project**. It does not seed fake evidence into a live customer tenant and it does not store a password in the repository.

## 1. Prepare a safe environment

1. Create or select a dedicated Supabase development/staging project.
2. Apply every migration in `supabase/migrations` to that project.
3. Copy `.env.demo.example` to `.env.demo` and replace every placeholder.
4. Set `DEMO_ALLOWED_SUPABASE_URL` to exactly the same URL as `SUPABASE_URL`.
5. Use a unique password of at least 16 characters and a test-only email domain or inbox.

Never point this file at the production database. The script refuses a URL mismatch, an incorrect confirmation phrase, or a production environment name.

## 2. Seed and verify

```bash
node --env-file=.env.demo scripts/seed-demo-client.mjs
node --env-file=.env.demo scripts/verify-demo-client.mjs
```

Re-running the seed is safe: fixed demonstration records are upserted and the three test users are reused. Their password is reset to the current private `DEMO_PASSWORD` value.

## 3. Run the products

Web/PWA:

```bash
npm run dev
```

Open the local URL printed by Vite. Install the PWA from a supported browser to test the installed layout.

Native app:

```bash
cd mobile
npm install
npx expo start
```

Use Expo Go for a rapid device test, or the repository's EAS profiles for development builds when testing push notifications and other native capabilities.

## 4. Test by role

The seed command prints the owner, manager and staff email addresses. All use the private `DEMO_PASSWORD` value.

### Staff journey

1. Sign in as `staff@<DEMO_EMAIL_DOMAIN>`.
2. Confirm Today shows the opening/closing routine, priority expiry and exception context.
3. Complete the opening check and add a normal fridge temperature.
4. Add a rejected delivery with a reason/corrective action, then confirm it appears in Goods in.
5. Complete a cleaning task and confirm the completion is shown in history.
6. Search allergens for “Chicken tikka wrap” and confirm milk and gluten are shown.
7. Check that management-only configuration is not available.

### Manager journey

1. Sign in as `manager@<DEMO_EMAIL_DOMAIN>`.
2. Open the seeded freezer exception and record/close the corrective action.
3. Review Jamie Evans's training record and the certificate expiry.
4. Add a cleaning schedule item and confirm staff can see it.
5. Review expiring documents and generate the inspection evidence export.
6. Confirm manager access does not silently become owner/billing access.

### Owner journey

1. Sign in as `owner@<DEMO_EMAIL_DOMAIN>`.
2. Review business, premises, team, notification and subscription settings.
3. Invite another test user and verify role/location scoping.
4. Request an inspector access link, verify its expiry/scope, then revoke it.
5. Complete checkout only with Stripe test-mode keys and a test card.

## 5. Offline and notification acceptance

1. On a device, load the app while online, then enable flight mode.
2. Create a temperature, delivery and cleaning completion. Confirm each is shown as queued/pending sync.
3. Force-close and reopen while still offline; confirm the queue survives.
4. Reconnect once, wait for sync, and verify each record exists only once on web.
5. Register notification permission on a real development build. Trigger the notification dispatcher in staging and verify start-of-day, issue and expiry deep links reach the intended screen.

Browser simulators do not prove APNs/FCM delivery. Push, email, SMS, Stripe, object storage, scheduled jobs and inspector links require staging credentials and end-to-end validation.

## 6. Evidence to retain before launch

- Screenshots/video of each role journey on iPhone and Android.
- Database verification output and automated test output.
- Duplicate-free offline sync evidence.
- Notification delivery/deep-link evidence.
- Stripe test checkout and webhook evidence.
- Backup restore drill and incident-response drill.
- Accessibility results, device/browser matrix and UK food-safety content sign-off.

The seeded content is illustrative software test data, not an FSA approval or a substitute for a food business's own HACCP/SFBB controls and local-authority advice.
