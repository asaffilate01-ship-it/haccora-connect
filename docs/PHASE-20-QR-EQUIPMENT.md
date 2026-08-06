# Phase 20 — QR equipment and maintenance evidence

## What changed

- Every active equipment or asset record has a unique business asset code and a non-sequential QR token.
- The web workspace prints individual or batch Haccora labels with the asset name, code and area.
- A scan opens the protected asset record in the PWA/web product or associated native app.
- iOS and Android include an in-app QR scanner, compact equipment register and offline-queued event capture.
- Equipment history is append-only: inspections, maintenance, repair, calibration, deep cleaning, faults, movements and external service records are attributable and server timestamped.
- A passing service or calibration updates the current summary while retaining history. An issue or failure moves the equipment to attention status.
- Owners/managers can change master details or retire an asset. Staff can read and add history but cannot edit/delete it. Inspectors require an explicit, time-limited `equipment` scope and remain read-only.
- Asset and event mutations feed the tamper-evident organisation audit chain, and equipment evidence is included in the inspection PDF.

## Label and scan acceptance

1. Print the label sheet from **Assets & maintenance** at 100% scale.
2. Use moisture/heat-resistant label stock suitable for the environment; never cover safety markings, ventilation, controls or manufacturer labels.
3. Scan each label with Haccora iOS, Haccora Android and the phone's normal camera.
4. Confirm sign-in is required and another tenant cannot resolve the token.
5. Add a check offline, reconnect and verify one event appears with the correct actor and server time.
6. Confirm staff cannot edit/delete the event and an equipment-scoped inspector cannot write.
7. Retire a test asset and confirm its QR/history remains readable but no new staff event can be added.

QR labels improve access and evidence capture; they do not replace statutory inspections, manufacturer servicing, calibration procedures or the food business's risk assessment.
