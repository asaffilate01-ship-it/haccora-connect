# Native evidence reliability — 28 October 2026

## Delivered

- Blank or whitespace temperature readings and limits are rejected instead of coercing to zero. Decimal dots/commas and negative values remain supported within the existing numeric limits; hexadecimal and exponent input are rejected.
- Check and temperature forms suppress concurrent duplicate taps, prevent editing during persistence, retain input on failure, and identify local storage separately from server confirmation. Explicit labels and 48-pixel save targets support accessible entry.
- A successful encrypted local save returns without waiting for network sync. A later upload failure cannot turn that durable save into a false “not saved” message.
- Queuing checks the active account against the evidence author. Uploads recheck account ownership for each item; another account's jobs remain stored and are excluded from its queue counts. Existing database RLS remains authoritative, including an account change during an in-flight request.
- Failed uploads remain queued with retry/error state. A generic uniqueness violation is no longer treated as proof that the matching evidence was saved. Background failures are caught; no retry-count limit discards evidence.
- Queue status reads serialize with writes; dashboards show failed upload counts and direct users to verify source records before re-entering evidence.

UK: author matching supports user_id, cleaning completed_by and equipment recorded_by fields. Existing inspector redirects are preserved.

## Validation and next gaps

Behavioural tests execute the queue and form source with isolated storage/network adapters: wrong-account rejection, retained evidence, switched-account uploads, storage/network failures, uniqueness conflicts, explicit zero versus blank input and duplicate taps. Full quality, native typecheck/export and fresh GitHub checks are merge gates.

1. Rehearse two-account queue ownership on physical iOS/Android devices, including app termination between secure writes and index writes, background/resume and expired sessions.
2. Add a reviewed conflict-resolution workflow with server record comparison and explicit acknowledgement. A conflict currently stays queued for investigation; do not delete it or assume every 23505 means idempotent success.
3. Continue German actions/incidents/documents/settings translations and large-text keyboard/device review.
4. Complete connected staging supplier/recall/Dishbee acceptance, scheduled-work totals and signed mobile releases from prior phase reports.

No database migrations, live provider changes, production deployment or signed release are included. Existing queued evidence is retained, including jobs belonging to another account; sign back into that account to inspect its status.
