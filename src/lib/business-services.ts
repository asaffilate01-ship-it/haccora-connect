export const SERVICE_CATEGORIES = [
  "All services",
  "Finance",
  "People",
  "Supplies",
  "Sales",
  "Technology",
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
    category: "Technology",
    title: "Turn business data into next actions",
    description:
      "Plan AI assistance for food-safety routines, management reporting and EPOS analysis.",
    benefits: [
      "Explore the AI workspace pilot",
      "Agree which business data can be connected",
      "Review proposed actions before execution",
    ],
    availability: "Pilot",
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
