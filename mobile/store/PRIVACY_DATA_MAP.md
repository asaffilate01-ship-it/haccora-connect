# Native privacy data map

This source-level map supports, but does not replace, the App Store privacy questionnaire, Google Play Data safety form or legal approval.

| Data or capability                           | Purpose                                                   | Storage or transfer                                                     | User control                                                            |
| -------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Account identity and organization membership | Authentication and tenant authorization                   | Supabase Auth and scoped application tables                             | Account/privacy-request workflow                                        |
| Food-safety records and evidence attachments | Core HACCP compliance workflow                            | Scoped database records and private storage                             | Role-based access, export and approved deletion workflow                |
| Camera and photo library                     | Attach evidence only after a user action                  | Selected media is uploaded to private storage                           | System permission prompt; denial leaves manual/document paths available |
| Documents                                    | Attach evidence only after a user action                  | Selected document is uploaded to private storage                        | System picker; no broad file access                                     |
| Biometrics                                   | Local re-authentication                                   | Biometric result only; biometric data remains with the operating system | Optional, with device-credential fallback                               |
| Push notification token                      | Operational reminders and alerts                          | Device token and delivery metadata                                      | System permission and in-app notification preferences                   |
| Device/session security metadata             | Session protection, incident investigation and revocation | Scoped security records                                                 | Session-management and privacy-request workflow                         |

Before submission, the privacy owner must compare this map with the actual production telemetry, SDK inventory, retention schedule and every store answer. Record approval in the private release evidence.
