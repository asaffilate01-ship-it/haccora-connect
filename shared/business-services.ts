export const SERVICE_CATEGORIES = [
  "All services",
  "Finance",
  "People",
  "Supplies",
  "Sales",
  "Technology",
  "AI & automation",
  "Reporting",
  "Legal",
] as const;

export type BusinessService = {
  id: string;
  name: string;
  category: Exclude<(typeof SERVICE_CATEGORIES)[number], "All services">;
  title: string;
  description: string;
  benefits: string[];
  availability: "Explore provider" | "Pilot" | "Request setup";
  href?: string;
  dataNeeded?: string[];
  reviewNote?: string;
};

export const BUSINESS_SERVICES: BusinessService[] = [
  {
    id: "veyumo",
    name: "Veyumo",
    category: "Technology",
    title: "Mobile for your business",
    description: "Explore business mobile connections for owners and teams.",
    benefits: [
      "Connect an existing Veyumo account",
      "Review available plans before purchasing",
      "Manage confirmed mobile lines",
    ],
    availability: "Request setup",
  },
  {
    id: "omni-intelligence",
    name: "Omniqora Intelligence",
    category: "AI & automation",
    title: "Turn business data into next actions",
    description:
      "Plan AI assistance for food-safety routines, management reporting and EPOS analysis.",
    benefits: [
      "Explore the AI workspace pilot",
      "Agree which business data can be connected",
      "Review proposed actions before execution",
    ],
    availability: "Pilot",
    dataNeeded: ["Selected food-safety records", "Approved EPOS summaries"],
    reviewNote:
      "Agree the scope and data access before connecting a pilot. Your team approves proposed actions.",
  },
  {
    id: "omni-agentic",
    name: "Omniqora Agentic AI",
    category: "AI & automation",
    title: "Coordinate tasks with approval",
    description:
      "Request AI workflows that prepare follow-ups, assign proposed tasks and coordinate work across approved services.",
    benefits: [
      "Propose follow-ups for overdue actions",
      "Prepare supplier or team communications for review",
      "Set approval limits and keep an action history",
    ],
    availability: "Request setup",
    dataNeeded: ["Chosen tasks and action records", "Approved service connections"],
    reviewNote:
      "Agree who can approve each action. Messages, purchases and record changes need the permissions set for that workflow.",
  },
  {
    id: "omni-genai",
    name: "Omniqora GenAI",
    category: "AI & automation",
    title: "Draft reports and business content",
    description:
      "Explore generative AI for management summaries, training drafts and customer communications.",
    benefits: [
      "Draft weekly management summaries",
      "Prepare training and communication drafts",
      "Review sources and edit before publishing",
    ],
    availability: "Request setup",
    dataNeeded: ["Documents and records you select"],
    reviewNote:
      "A responsible person reviews generated content. Food-safety instructions and allergen statements need qualified review.",
  },
  {
    id: "omni-intelligent-ai",
    name: "Omniqora Intelligent AI",
    category: "AI & automation",
    title: "Spot patterns and emerging problems",
    description:
      "Scope anomaly detection and forecasting across food-safety operations, waste, demand and equipment performance.",
    benefits: [
      "Investigate unusual readings or recurring issues",
      "Explore demand and waste forecasts",
      "Review confidence, assumptions and suggested action",
    ],
    availability: "Request setup",
    dataNeeded: ["Relevant historical records", "Approved sales or equipment data"],
    reviewNote:
      "Forecasts need sufficient data and validation. They do not replace measurements or mandatory checks.",
  },
  {
    id: "omni-rag",
    name: "Omniqora RAG",
    category: "AI & automation",
    title: "Ask questions of approved documents",
    description:
      "Plan an AI knowledge assistant that retrieves evidence from your approved procedures, manuals and business documents.",
    benefits: [
      "Find relevant passages with source references",
      "Keep document versions and access permissions",
      "Identify missing evidence instead of guessing",
    ],
    availability: "Request setup",
    dataNeeded: ["Approved procedures, manuals and policies"],
    reviewNote:
      "Agree which documents may be indexed, who can access answers and when content must be reviewed.",
  },
  {
    id: "omni-graphrag",
    name: "Omniqora GraphRAG",
    category: "AI & automation",
    title: "Explore connected business evidence",
    description:
      "Request relationship-based analysis connecting suppliers, products, batches, assets, locations and incidents.",
    benefits: [
      "Trace connected records with source references",
      "Explore recurring causes across sites",
      "Investigate the possible impact of an affected batch or asset",
    ],
    availability: "Request setup",
    dataNeeded: ["Selected traceability records", "Supplier, asset and location references"],
    reviewNote:
      "Relationship analysis supports investigation. Confirm the evidence before taking operational or recall action.",
  },
  {
    id: "omni-metrics",
    name: "Omniqora Metrics",
    category: "Reporting",
    title: "See performance across your sites",
    description:
      "Scope dashboards combining compliance, task completion, waste, sales and staffing measures.",
    benefits: [
      "Agree KPI definitions and targets",
      "Compare sites and reporting periods",
      "Track source freshness and missing data",
    ],
    availability: "Request setup",
    dataNeeded: ["Selected Haccora operational totals", "Approved EPOS or staffing summaries"],
    reviewNote:
      "Only connected, authorised sources can populate a dashboard. Agree definitions before comparing sites.",
  },
  {
    id: "omni-financials",
    name: "Omniqora Financials",
    category: "Finance",
    title: "Understand costs, margins and cash flow",
    description:
      "Plan management reporting for food costs, labour, waste, menu margins and cash-flow scenarios.",
    benefits: [
      "Connect approved sales and accounting summaries",
      "Explore costs and margin scenarios",
      "Prepare reporting for review with your accountant",
    ],
    availability: "Request setup",
    dataNeeded: ["Approved sales, purchasing and accounting data"],
    reviewNote:
      "Management estimates depend on the connected data and assumptions. Tax filings and financial decisions remain subject to professional review.",
  },
  {
    id: "lawquo",
    name: "Lawquo",
    category: "Legal",
    title: "Find the right legal support",
    description:
      "Request an introduction for business contracts, employment questions, premises issues or commercial disputes.",
    benefits: [
      "Describe the type of help required",
      "Discuss an appropriate professional and fees",
      "Agree document sharing directly before an introduction",
    ],
    availability: "Request setup",
    reviewNote:
      "Keep confidential case details out of an initial enquiry. An introduction does not establish legal representation.",
  },
  {
    id: "taxnuvia",
    name: "TaxNuvia",
    category: "Finance",
    title: "Find an accountant",
    description: "Find accounting support for your café, restaurant or food business.",
    benefits: [
      "Bookkeeping, payroll and VAT support",
      "Year-end accounts and tax returns",
      "Discuss fees directly with a firm",
    ],
    availability: "Explore provider",
    href: "https://taxnuvia.co.uk/from/haccora",
  },
  {
    id: "xpertjobs",
    name: "XpertJobs",
    category: "People",
    title: "Build your kitchen team",
    description: "Explore recruitment for kitchen, front-of-house and management roles.",
    benefits: [
      "Discuss vacancies and hiring needs",
      "Explore employer recruitment tools",
      "Keep hiring separate from staff health records",
    ],
    availability: "Explore provider",
    href: "https://xpertjobs.lovable.app",
  },
  {
    id: "suppliers",
    name: "Suppliers & Zarvane Foods",
    category: "Supplies",
    title: "Source your next delivery",
    description:
      "Request introductions for rice, pulses, ingredients, packaging and business supplies.",
    benefits: [
      "Tell us your quantities and delivery area",
      "Request supplier prices and availability",
      "Approve each supplier in your Haccora register",
    ],
    availability: "Request setup",
  },
  {
    id: "dishbee",
    name: "Dishbee",
    category: "Sales",
    title: "EPOS, ordering and your website",
    description:
      "Discuss tills, kitchen ordering, online sales and a website for your food business.",
    benefits: [
      "Map your till and kitchen workflow",
      "Plan online ordering and collection",
      "Explore reporting connections with Omniqora",
    ],
    availability: "Request setup",
  },
  {
    id: "eventplanr",
    name: "EventPlanr",
    category: "Sales",
    title: "Find catering and event opportunities",
    description: "Explore offering catering, private dining or venue hire to event customers.",
    benefits: [
      "Discuss a catering or venue listing",
      "Prepare packages and availability",
      "Agree booking terms before joining",
    ],
    availability: "Request setup",
  },
  {
    id: "craftvaro",
    name: "Craftvaro",
    category: "Supplies",
    title: "Repairs, maintenance and refits",
    description: "Find help with premises maintenance, equipment work and larger refurbishments.",
    benefits: [
      "Describe the work and location",
      "Discuss suitable trades and quotations",
      "Keep service evidence with the relevant asset",
    ],
    availability: "Request setup",
  },
  {
    id: "insure360",
    name: "Insure360",
    category: "Finance",
    title: "Explore business insurance",
    description: "Request an introduction to discuss your food business insurance needs.",
    benefits: [
      "Describe your premises and activities",
      "Discuss options with an authorised provider",
      "Review cover, exclusions and price before buying",
    ],
    availability: "Request setup",
  },
  {
    id: "omni-comms",
    name: "Omniqora Communications",
    category: "Technology",
    title: "Handle more customer enquiries",
    description: "Discuss business phone numbers, call handling and AI reception for your team.",
    benefits: [
      "Plan calls across your locations",
      "Explore missed-call follow-up",
      "Agree recording and AI handling settings",
    ],
    availability: "Request setup",
  },
  {
    id: "zoryn-rewards",
    name: "Zoryn Rewards",
    category: "Sales",
    title: "Give customers a reason to return",
    description: "Explore a loyalty programme that fits your food business and till setup.",
    benefits: [
      "Plan earning and redemption rules",
      "Discuss customer offers",
      "Confirm POS compatibility and programme costs",
    ],
    availability: "Request setup",
  },
  {
    id: "training",
    name: "Staff training",
    category: "People",
    title: "Prepare your team for the next shift",
    description: "Request training options for food hygiene, allergens and workplace skills.",
    benefits: [
      "Identify roles and training needs",
      "Confirm course recognition and prices",
      "Record completed training and expiry dates",
    ],
    availability: "Request setup",
  },
];

export const SERVICE_REQUEST_STATUS: Record<string, string> = {
  open: "Request received",
  in_progress: "Being reviewed",
  pending_customer: "Awaiting your reply",
  resolved: "Request resolved",
  closed: "Request closed",
};

export function filterBusinessServices(query: string, category = "All services") {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return BUSINESS_SERVICES.filter((item) => {
    const text = [item.name, item.title, item.description, ...item.benefits]
      .join(" ")
      .toLowerCase();
    return (
      (category === "All services" || item.category === category) &&
      terms.every((term) => text.includes(term))
    );
  });
}
