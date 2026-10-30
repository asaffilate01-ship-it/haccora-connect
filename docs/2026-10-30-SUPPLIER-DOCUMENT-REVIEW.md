# Supplier document metadata review — 30 October 2026

The supplier directory now includes a paginated review of active supplier-category documents. Reads explicitly filter the active organisation and selected site. Each page contains up to 50 documents ordered by creation time and ID. Failures and account/site changes hide unconfirmed records and provide retry feedback.

Flags identify missing usable source references, missing versions or expiry dates, invalid dates, passed expiry dates, expiry within 30 calendar days, future issue dates and issue dates after expiry. Date-only and database timestamp expiry representations are supported; timestamp dates use the edition's operational timezone. The displayed review date is a snapshot refreshed on request. Missing expiry is a request to clarify metadata, not proof a document is invalid.

The list includes document title and reference and links to the existing document register for inspection. It does not open external URLs or bypass existing file scanning. HTTPS source presence is not evidence that the source is authentic, reachable or safe. The panel does not associate documents with individual suppliers because the current document schema lacks that relationship. It is not OCR, content extraction, an AI agent, an approval or a saved review record.

The web supplier form now explicitly creates pending suppliers rather than declaring them approved on insertion. Existing supplier statuses, native/other writers and the database default are unchanged. A future server-owned review and approval workflow must cover all write paths; this change is not enforcement of that future policy.

Five regressions per edition cover date/source classification, database timestamps, failed reads, query scoping, pagination and account changes. No migration, external AI subscription or deployment is introduced.
