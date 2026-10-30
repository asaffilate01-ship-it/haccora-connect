# Today attention view — 30 October 2026

The UK Today screen now lists temperature exceptions, open corrective actions, open incidents, unfinished checks created today and unfinished checks from previous days. Each category links to its existing register. Counts are attention signals, not unique incidents; multiple categories may describe the same event.

All reads explicitly filter the active organisation and, when selected, site. Database access policies still determine which records a user can see. Today's interval is calculated in Europe/London on each refresh, with both start and end bounds. Completion compares completed and unfinished checks created in that same interval; no percentage is shown for an empty cohort. Older unfinished checks are a backlog, not a claim about their due dates.

Operational counts and recommendations are hidden during loading, failed refreshes and account/site changes. Returned errors, rejected requests and missing counts produce retry feedback. Request generations discard obsolete responses. The view displays its refresh time; it is a snapshot and does not automatically roll over at midnight.

Six component regressions cover failure states, query scope/date bounds, backlog prioritisation, completion cohorts, account changes and retry recovery. Existing operational-day tests cover timezone boundaries.

This phase changes the UK Today route only. Germany's separate dashboard, supplier extraction, AI agents and MCP tools remain follow-up work. No AI service, background worker, production migration or deployment is introduced.
