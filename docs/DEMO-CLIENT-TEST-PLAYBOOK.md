# Haccora demo client test playbook

This creates a repeatable, UK-only demonstration business in a **non-production Supabase project**. It does not seed fake evidence into a live customer tenant and it does not store a password in the repository.

## 1. Prepare a safe environment

1. Create or select a dedicated Supabase development/staging project.
2. Apply every migration in `supabase/migrations` to that project.
3. Copy `.env.demo.example` to `.env.demo` and replace every placeholder.
4. Set `DEMO_ALLOWED_SUPABASE_URL` to exactly the same URL as `SUPABASE_URL`.
5. Add the staging project's publishable key as `SUPABASE_PUBLISHABLE_KEY`.
6. Use a unique password of at least 16 characters and a test-only email domain or inbox.

Never point this file at the production database. The script refuses a URL mismatch, an incorrect confirmation phrase, or a production environment name.

## 2. Seed and verify

For the hosted staging project, prefer the protected `Protected staging rehearsal` GitHub workflow from Phase 25. It validates that staging and production project refs differ, previews migrations before applying them, deploys Edge Functions, runs all three commands below and stores redacted evidence in one operation.

```bash
npm run demo:seed
npm run demo:verify
npm run demo:access
```

Re-running the seed is safe: fixed demonstration records are upserted and the seven test users are reused. Their password is reset to the current private `DEMO_PASSWORD` value. `demo:access` signs in through the publishable client as every identity and checks the deployed RLS boundary; it does not use the service key for those assertions.

The accounts are created only after the latest migrations have been applied to the selected non-production project and `npm run demo:seed` succeeds. Source code alone cannot create hosted logins without that project's private service-role key. Phase 25 also checks that every visible assets, document, goods-in, training, cleaning, corrective-action and asset-history row remains in the signed-in tenant, and proves that an inspector cannot insert operational evidence.

## 3. Run the products

Web/PWA:

```bash
npm run dev
```

Open the local URL printed by Vite. Install the PWA from a supported browser to test the installed layout.

Native app:

```bash
cd mobile
npm ci
npx expo start
```

Use Expo Go for a rapid device test, or the repository's EAS profiles for development builds when testing push notifications and other native capabilities.

## 4. Demo logins

With the default `DEMO_EMAIL_DOMAIN=demo.haccora.co.uk`, the seed creates:

| Test identity      | Login                                | Expected boundary                                              |
| ------------------ | ------------------------------------ | -------------------------------------------------------------- |
| Haccora SaaS owner | `saas-owner@demo.haccora.co.uk`      | Aggregate, audited platform console; no tenant evidence bypass |
| Tenant admin       | `tenant-admin@demo.haccora.co.uk`    | Riverside owner, team and billing                              |
| Manager            | `manager@demo.haccora.co.uk`         | Riverside operational management; no billing                   |
| Chef               | `chef@demo.haccora.co.uk`            | Riverside kitchen leadership and record contribution           |
| Staff              | `staff@demo.haccora.co.uk`           | Riverside selected-site daily work                             |
| Inspector          | `inspector@demo.haccora.co.uk`       | Read-only, time/location/scope-limited Riverside evidence      |
| Isolation owner    | `isolation-owner@demo.haccora.co.uk` | Harbour Café only; proves cross-tenant denial                  |

All accounts use the private `DEMO_PASSWORD` from `.env.demo`. The password is intentionally never committed or printed. If `DEMO_EMAIL_DOMAIN` changes, use the same local parts at that domain.

## 5. Test by role

### SaaS owner journey

1. Sign in as `saas-owner@<DEMO_EMAIL_DOMAIN>` and confirm `/platform` opens.
2. Confirm aggregate workspace, location, user, subscription and trial totals appear.
3. Confirm the customer directory contains Riverside Kitchen and Harbour Café account metadata, but no operational evidence or staff PII.
4. Confirm the page explains that platform status does not bypass tenant RLS.
5. Run `npm run demo:access` and retain proof that this account sees zero rows through normal tenant tables.
6. Refresh the overview and confirm server-timestamped overview/directory audit events are added.

### Tenant admin journey

1. Sign in as `tenant-admin@<DEMO_EMAIL_DOMAIN>`.
2. Review business, premises, team, notification and subscription settings.
3. Invite another test user and verify role/location scoping.
4. Request an inspector access link, verify its expiry/scope, then revoke it.
5. Complete checkout only with Stripe test-mode keys and a test card.
6. Grant a test inspector only the Equipment scope and confirm the inspector can read asset history but cannot add, edit, retire or delete anything.

### Staff journey

1. Sign in as `staff@<DEMO_EMAIL_DOMAIN>`.
2. Confirm Today shows the opening/closing routine, priority expiry and exception context.
3. Complete the opening check and add a normal fridge temperature.
4. Add a rejected delivery with a reason/corrective action, then confirm it appears in Goods in.
5. Complete a cleaning task and confirm the completion is shown in history.
6. Search allergens for “Chicken tikka wrap” and confirm milk and gluten are shown.
7. Check that management-only configuration is not available.
8. Open Equipment and scan a printed demo QR. Start the overdue fridge check, enter an in-range reading and confirm the attributed timestamp appears once in history.
9. Repeat with an out-of-range reading. Confirm the UI and server require a corrective action and the equipment changes to attention status.

### Manager journey

1. Sign in as `manager@<DEMO_EMAIL_DOMAIN>`.
2. Open the seeded freezer exception and record/close the corrective action.
3. Review Jamie Evans's training record and the certificate expiry.
4. Add a cleaning schedule item and confirm staff can see it.
5. Review expiring documents and generate the inspection evidence export.
6. Confirm manager access does not silently become owner/billing access.
7. Add equipment, attach a recurring check with a safe reading range and print its label sheet. Complete it as staff and confirm the next-due summary advances without overwriting history.
8. Switch the staff profile to a second test location and confirm the first location's equipment and history are not exposed; switch back and confirm they return.

### Chef journey

1. Sign in as `chef@<DEMO_EMAIL_DOMAIN>`.
2. Confirm kitchen, HACCP, allergen, goods-in and equipment contribution tools are available.
3. Confirm billing, team role management and tenant security administration are unavailable.
4. Add operational evidence and verify server attribution uses the chef account.

### Inspector journey

1. Sign in as `inspector@<DEMO_EMAIL_DOMAIN>` and confirm the inspection workspace opens.
2. Confirm Riverside evidence in the seeded scopes is readable and staff health/profile data is not.
3. Open the seeded equipment and its history, then confirm create/edit/retire/check actions are unavailable.
4. Confirm Harbour Café and all of its evidence are invisible.

### Isolation-owner journey

1. Sign in as `isolation-owner@<DEMO_EMAIL_DOMAIN>`.
2. Confirm only Harbour Café – Bristol and its single temperature record are visible.
3. Confirm Riverside Kitchen, its people, subscription, equipment and evidence do not appear.

## 6. Offline and notification acceptance

1. On a device, load the app while online, then enable flight mode.
2. Create a temperature, delivery and cleaning completion. Confirm each is shown as queued/pending sync.
3. Force-close and reopen while still offline; confirm the queue survives.
4. Reconnect once, wait for sync, and verify each record exists only once on web.
5. Register notification permission on a real development build. Trigger the notification dispatcher in staging and verify start-of-day, issue and expiry deep links reach the intended screen.

Browser simulators do not prove APNs/FCM delivery. Push, email, SMS, Stripe, object storage, scheduled jobs and inspector links require staging credentials and end-to-end validation.

## 7. Evidence to retain before launch

- Screenshots/video of each role journey on iPhone and Android.
- Database verification output and automated test output.
- Duplicate-free offline sync evidence.
- Notification delivery/deep-link evidence.
- Stripe test checkout and webhook evidence.
- Backup restore drill and incident-response drill.
- Accessibility results, device/browser matrix and UK food-safety content sign-off.

The seeded content is illustrative software test data, not an FSA approval or a substitute for a food business's own HACCP/SFBB controls and local-authority advice.
