export type HelpCentreArticle = {
  question: string;
  answer: string;
};

export type HelpCentreSection = {
  title: string;
  description: string;
  articles: HelpCentreArticle[];
};

export const HELP_CENTRE_SECTIONS: HelpCentreSection[] = [
  {
    title: "Getting started",
    description: "Set up the business, premises and food-safety approach before inviting the team.",
    articles: [
      {
        question: "What should a new business configure first?",
        answer:
          "Add the legal business and premises details, select the correct UK nation, record the local authority or district council, then add responsible users, equipment and the opening and closing routines used at that premises.",
      },
      {
        question: "Does Haccora choose my HACCP or safe-method controls for me?",
        answer:
          "No. Haccora structures hazards, controls, monitoring, corrective action and approval, but the food business must choose procedures that fit its activities. Use the relevant official approach, such as SFBB, CookSafe, Safe Catering or a suitable HACCP system, and obtain competent advice where needed.",
      },
      {
        question: "Can I copy a setup to another site?",
        answer:
          "Authorised tenant users can use approved templates as a starting point for another premises. Each site still needs its own equipment, responsible people, local context, limits and documented approval before the copied workflow is relied on.",
      },
    ],
  },
  {
    title: "Daily records and alerts",
    description: "Understand tasks, temperatures, corrective actions and synchronisation.",
    articles: [
      {
        question: "How do start-of-day and closing routines work?",
        answer:
          "Managers schedule the checks for a premises and assign responsibility. Staff see due work in Today, record the result and add a correction when a check fails. Completion, user and server evidence are retained in the audit history.",
      },
      {
        question: "What happens when a temperature is outside its configured limit?",
        answer:
          "The reading is retained, marked as a deviation and linked to corrective action. Configured responsible users can receive in-app, email or push notices after the production notification providers and schedules have been enabled.",
      },
      {
        question: "What does queued offline mean?",
        answer:
          "A queued item is stored on the device but is not yet server-confirmed evidence. Native core flows synchronise when connectivity returns and show whether a record is queued, sending, confirmed or needs attention.",
      },
    ],
  },
  {
    title: "People, training and permissions",
    description: "Give each person only the access needed for their work.",
    articles: [
      {
        question: "Which built-in roles are available?",
        answer:
          "Tenant roles include owner, manager, chef, staff and time-limited inspector. Platform owner, support and auditor roles are separate from tenant evidence. Subscription limits and database row-level security are enforced independently of the screen navigation.",
      },
      {
        question: "Can a tenant create a custom role?",
        answer:
          "An authorised tenant user can create a role that removes permissions from an allowed built-in baseline. A custom role cannot grant more access than its baseline or bypass subscription entitlements, premises scope or row-level security.",
      },
      {
        question: "How are training certificates and expiry dates managed?",
        answer:
          "Store the training type, provider, completion and expiry dates with private supporting evidence. Expiry rules can create reminders for responsible users. Health and training data must be collected lawfully, kept private and retained only as long as needed.",
      },
    ],
  },
  {
    title: "Allergens and traceability",
    description:
      "Maintain source evidence while keeping business decisions and verification explicit.",
    articles: [
      {
        question: "Does Haccora decide whether a recipe is safe for someone with an allergy?",
        answer:
          "No. Haccora records ingredients, supplier declarations, recipe allergens and review evidence. The business must verify current source information, control cross-contact, train staff and give accurate information to customers. Do not rely on a generated matrix when a supplier, ingredient or process has changed but has not been reviewed.",
      },
      {
        question: "How does Haccora support PPDS labelling work?",
        answer:
          "The product record can link recipes, ingredients, the 14 regulated allergens, supplier evidence and label review. The food business remains responsible for deciding whether a product is prepacked for direct sale and for checking the complete label against current UK requirements before sale.",
      },
      {
        question: "Can I trace a supplier or affected batch?",
        answer:
          "Authorised users can connect suppliers, deliveries, lots or batches, recipes and incident or recall actions to support one-step-back and one-step-forward evidence. The business must test its traceability and withdrawal or recall procedure and preserve any additional records required for its products and supply chain.",
      },
    ],
  },
  {
    title: "Privacy, GPS and workforce transparency",
    description: "Collect only evidence that is necessary, explained and appropriately restricted.",
    articles: [
      {
        question: "Does Haccora continuously track staff location?",
        answer:
          "No. Haccora does not require background location tracking. Where a customer enables location evidence for a specific foreground action, it must explain the purpose to staff, select a lawful basis, limit access and retention, and assess whether the collection is necessary and proportionate.",
      },
      {
        question: "Who is responsible for staff privacy information?",
        answer:
          "The customer normally decides why and how its workforce data is used and must provide clear privacy information. Haccora Ltd processes customer data under the signed terms and data-processing agreement. Customers should document their lawful basis and complete a data-protection impact assessment where the processing is likely to create high risk.",
      },
      {
        question: "Can support staff browse tenant records?",
        answer:
          "Platform support does not automatically bypass tenant row-level security or private evidence storage. Any exceptional support access must use an authorised, time-bounded and audited route with a recorded reason; it must not be granted merely by hiding or showing a screen control.",
      },
    ],
  },
  {
    title: "Equipment QR labels",
    description: "Identify equipment and preserve its check, reading and maintenance history.",
    articles: [
      {
        question: "What is included on a printable equipment label?",
        answer:
          "The label carries a protected QR reference and human-readable asset details suitable for the label format. Scanning resolves the current asset and premises in Haccora; confidential history is never encoded directly in the QR image.",
      },
      {
        question: "What evidence is captured when a QR code is scanned?",
        answer:
          "The protected scan can record the asset, premises, user, server time, device time and the resulting action. Foreground GPS may be added only where the business has enabled it, explained the purpose and has a lawful reason to collect it.",
      },
      {
        question: "Can a scan open the complete asset history?",
        answer:
          "Yes, for a signed-in user whose role and premises scope allow it. The asset screen shows previous scans, checks, readings, maintenance, calibration and corrections, then allows an authorised user to add the next time-stamped record.",
      },
    ],
  },
  {
    title: "Inspection and evidence",
    description: "Prepare a clear, scoped record without exposing unrelated tenant data.",
    articles: [
      {
        question: "How should I use Inspector Mode?",
        answer:
          "An authorised user selects the premises, period and evidence categories, then creates a time-limited read-only view. Review the scope before sharing it. Haccora does not decide what an authorised officer requires or guarantee an inspection result.",
      },
      {
        question: "Can I download an evidence pack?",
        answer:
          "Authorised users can generate a pack for the chosen period and scope. Exports should show their generation time and source context. The business remains responsible for checking completeness before relying on or sharing the pack.",
      },
      {
        question: "Are audit entries editable?",
        answer:
          "Operational records are corrected by adding attributable follow-up evidence rather than silently rewriting history. Security-sensitive changes and exports are logged so authorised reviewers can understand who did what and when.",
      },
    ],
  },
  {
    title: "Subscription and data",
    description: "Manage plan limits, billing access, exports and account closure.",
    articles: [
      {
        question: "What changes when a subscription changes?",
        answer:
          "Plan entitlements set limits such as premises, users and available modules. A downgrade must not erase existing evidence; restricted features become unavailable according to the subscription state and the customer is given an export path.",
      },
      {
        question: "Who can view billing and financial information?",
        answer:
          "Tenant billing is limited to authorised tenant owners or billing users. Haccora platform financial metrics are limited to the permitted platform roles. Support access does not grant direct access to customer food-safety evidence.",
      },
      {
        question: "What happens to data after cancellation?",
        answer:
          "Customers should export required evidence before closure. Access, retention and deletion follow the signed terms, data-processing agreement and configured retention policy; statutory or dispute holds may require specific records to be retained for longer.",
      },
    ],
  },
  {
    title: "Devices, security and integrations",
    description: "Check platform support and understand what must be configured for production.",
    articles: [
      {
        question: "Which devices can run Haccora?",
        answer:
          "The responsive web app supports current phone, tablet and desktop browsers and can be installed as a PWA. Native iOS and Android builds cover high-frequency core flows; store availability depends on signed Apple and Google release approval.",
      },
      {
        question: "Which integrations are live?",
        answer:
          "Sensor ingestion has a defined production boundary. Email, push, payments, malware scanning and monitoring work only after their named production providers and credentials are configured. POS and supplier connectors remain roadmap items until a provider is contracted and tested.",
      },
      {
        question: "How do I report a security or service issue?",
        answer:
          "Use the verified support channel shown in Haccora. Do not include passwords, full payment details or unnecessary personal data. Urgent food-safety incidents must still follow the business's incident procedure and any authority reporting requirement.",
      },
    ],
  },
];
