export const MARKETING_FAQS = [
  {
    question: "Is Haccora approved by the Food Standards Agency or my local authority?",
    answer:
      "Haccora is not approved or endorsed by the FSA, Food Standards Scotland, a local authority or an environmental health officer, and using it does not guarantee an inspection outcome or food hygiene rating. It helps businesses operate HACCP-based controls and present organised digital evidence, but the food business remains responsible for suitable procedures and an authorised officer assesses compliance in context.",
  },
  {
    question: "Can Haccora replace paper food-safety records?",
    answer:
      "Official guidance allows food-safety records to be kept electronically where the arrangements are appropriate to the nature and size of the business. Haccora provides attributable, time-stamped records and exports, but each business must keep its procedures current, retain records for an appropriate period and make suitable evidence available to its authorised officer.",
  },
  {
    question: "Does Haccora cover the whole United Kingdom?",
    answer:
      "Yes. Haccora has separate context for England, Wales, Scotland and Northern Ireland, including the relevant regulator, local-authority or district-council relationship and rating scheme. Official guidance and local requirements remain authoritative.",
  },
  {
    question: "What can my team record?",
    answer:
      "Teams can complete opening and closing routines, temperature and cleaning records, delivery checks, allergen and PPDS controls, training and document evidence, incidents, corrective actions, expiry checks, traceability and equipment records. Available tools depend on the subscription and the user's role.",
  },
  {
    question: "What happens when an environmental health officer visits?",
    answer:
      "An authorised user can provide a time-limited, read-only Inspector Mode view or generate an evidence pack covering the selected period. Access is scoped and expiring, and the business controls what is shared.",
  },
  {
    question: "Does Haccora work on phones, tablets and desktop computers?",
    answer:
      "The responsive web app works across modern phones, tablets and desktop browsers and can be installed as a PWA. Native iOS and Android builds support high-frequency food-safety tasks; public app-store availability begins only after signed store approval.",
  },
  {
    question: "Can staff keep working without a reliable signal?",
    answer:
      "Core native records can be stored in an encrypted offline queue and synchronised when connectivity returns. The app clearly distinguishes a locally queued record from server-confirmed evidence so staff do not mistake pending data for completed synchronisation.",
  },
  {
    question: "How do equipment QR codes work?",
    answer:
      "Haccora creates printable QR labels for equipment. A scan resolves the protected asset and premises, opens its history and can link a new check or reading to the user, server and device time, with optional foreground GPS evidence where the business has a lawful and transparent reason to collect it.",
  },
  {
    question: "Can different staff have different permissions?",
    answer:
      "Yes. Haccora separates SaaS operators, tenant owners, managers, chefs, staff and time-limited inspectors. Tenant-defined roles can reduce a built-in role's permissions but cannot exceed it; database row-level security remains the final enforcement boundary.",
  },
  {
    question: "How does Haccora support UK GDPR and security?",
    answer:
      "Tenant and premises boundaries, private evidence storage, restricted health records, audit trails and controlled downloads are built in. Each customer is still responsible for its lawful basis, staff privacy information, retention decisions and any required data-protection impact assessment.",
  },
  {
    question: "How long does setup take?",
    answer:
      "A simple single-site business can start with its premises, users, equipment and daily routines, then add recipes, suppliers, HACCP content, documents and training. Larger or higher-risk operations should complete a structured implementation and food-safety review before relying on the system.",
  },
  {
    question: "How do the trial, cancellation and data export work?",
    answer:
      "Tenant owner accounts are approval-only. Haccora may activate a two-month trial or a paid plan, after which the owner can invite users and premises within the subscription limits. A failed payment starts a seven-day grace period: existing access continues, but new users and premises are blocked. Access may then be restricted without deleting customer evidence. Restoration, export, retention and deletion follow the agreed subscription and data-processing terms.",
  },
] as const;
