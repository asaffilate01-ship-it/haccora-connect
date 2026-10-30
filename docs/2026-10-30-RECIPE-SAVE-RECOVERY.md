# Recipe register recovery — 30 October 2026

## Findings and changes

Recipe reads previously ignored database errors, making failures appear to be an empty register. Inserts closed the form regardless of the returned error, and deletes did not verify that a record was removed. Both editions now surface these failures and retain user input on an unconfirmed save.

- Reads filter by the active organisation, use deterministic 100-row pages, expose refresh/retry, and discard stale responses after account changes or newer requests.
- Saves require a name and explicit non-negative amounts with at most two decimal places within the database range. UK retains GBP provenance; Germany retains EUR.
- Immediate submission locks prevent duplicate taps. Each open form retains one idempotency key for retries. A duplicate-key response succeeds only after an organisation/author/key-scoped lookup matches every submitted field.
- Saves verify the authenticated account and current editing permission after asynchronous work. Only an exactly confirmed row closes the form.
- Deletes are scoped to the organisation and must return the requested row ID. An unconfirmed deletion retains the displayed recipe and provides refresh guidance.
- Existing role permissions and database policies remain authoritative; no migration or production data change is included.

## Validation and limits

Eight component/helper regressions per edition cover failed loads, zero-row deletes, retained input, repeated submission, exact duplicate recovery, amount validation, permission denial and account changes. Full quality gates cover type-checking, linting, formatting and production builds.

Retry identity lasts only while the form remains mounted. After closing or reloading following an uncertain save, refresh the register before creating another recipe. This is not a durable offline draft system. Record creation/deletion does not implement recipe editing, ingredient approval, shelf-life policy, final food labels or printer confirmation. Hosted authenticated acceptance and physical-device testing remain separate release requirements.
