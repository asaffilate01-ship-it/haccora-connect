import {
  Thermometer,
  ClipboardCheck,
  Wheat,
  Users,
  ShieldCheck,
  Bell,
  Truck,
  Snowflake,
  Droplets,
  FileClock,
  type LucideIcon,
} from "lucide-react";

export type IndustryPain = { icon: LucideIcon; title: string; body: string };
export type IndustryFaq = { question: string; answer: string };

export type IndustryContent = {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  audience: string;
  intro: string;
  pains: IndustryPain[];
  timeline: string[];
  faqs: IndustryFaq[];
};

export const INDUSTRY_BASE_URL = "https://haccora.co.uk/industries";

export const TAKEAWAYS: IndustryContent = {
  slug: "takeaways-and-fast-food",
  eyebrow: "Takeaways & fast food",
  metaTitle: "Food Safety Software for UK Takeaways & Fast Food — Haccora",
  title: "Food safety software for UK takeaways and fast food",
  description:
    "Digital HACCP, fryer and hot-hold temperature logs, oil quality checks, cleaning rotas and allergen controls for UK takeaways. Inspection-ready evidence for your food hygiene rating.",
  audience: "Takeaways and fast food businesses in the United Kingdom",
  intro:
    "High-volume service, part-time staff and late finishes make paper records the first thing to slip. Haccora keeps every fryer, hot-hold and delivery check logged on the phone already in the kitchen.",
  pains: [
    {
      icon: Thermometer,
      title: "Fryer, hot-hold and reheat checks",
      body: "Core temperature checks with time stamps and the name of the person who took them, straight from a phone at the pass.",
    },
    {
      icon: Droplets,
      title: "Cooking oil quality logged",
      body: "Record oil tests, filtration and changes so quality and disposal evidence is always available.",
    },
    {
      icon: Wheat,
      title: "Allergens for every menu item",
      body: "Recipe-level allergen matrix that matches what your delivery platform listings and staff tell customers.",
    },
    {
      icon: Truck,
      title: "Deliveries and supplier records",
      body: "Goods-in temperature and condition checks with photo evidence, plus supplier approval records for traceability.",
    },
    {
      icon: Bell,
      title: "Nothing missed on a late shift",
      body: "Shift-based reminders with manager escalation when a closing check has not been completed.",
    },
    {
      icon: ShieldCheck,
      title: "Inspection pack in one tap",
      body: "Dated evidence pack covering plan, monitoring, corrective actions, cleaning and training.",
    },
  ],
  timeline: [
    "Day 1 — pick the takeaway template and confirm fryers, hot-hold units and fridges",
    "Day 2 — add the team, roles and Level 2 certificates",
    "Week 1 — opening, closing, oil and temperature checks running on every shift",
    "Week 2 — allergen matrix signed off and first inspection pack generated",
  ],
  faqs: [
    {
      question: "Does Haccora suit a small takeaway with two or three staff?",
      answer:
        "Yes. The Food Cart plan covers a single premises with up to seven staff, and the daily checks are designed to take under five minutes per shift.",
    },
    {
      question: "Can we record cooking oil checks?",
      answer:
        "Yes. Oil quality tests, filtration and changes are logged against each fryer, with reminders and a full history for inspection.",
    },
    {
      question: "What about delivery platform allergen information?",
      answer:
        "Your recipe-level allergen matrix gives one consistent answer, so what staff say matches what is published on your listings and menus.",
    },
    {
      question: "Will it work if the kitchen has poor signal?",
      answer:
        "Yes. Checks can be captured offline on iOS and Android and sync automatically once the device reconnects.",
    },
  ],
};

export const PUBS: IndustryContent = {
  slug: "pubs-and-bars",
  eyebrow: "Pubs & bars",
  metaTitle: "Food Safety & Cellar Compliance Software for UK Pubs — Haccora",
  title: "Food safety and cellar compliance software for UK pubs and bars",
  description:
    "Digital HACCP, kitchen and cellar temperature logs, line cleaning records, allergen controls and staff training for UK pubs and bars. Inspection-ready evidence in one place.",
  audience: "Pubs and bars in the United Kingdom",
  intro:
    "A pub runs a kitchen, a cellar and a bar with different teams and different risks. Haccora keeps all three sets of records in one dated, searchable log.",
  pains: [
    {
      icon: Snowflake,
      title: "Cellar and kitchen temperatures",
      body: "Cellar, fridge, freezer and hot-hold checks scheduled by area, with automatic corrective actions when readings drift.",
    },
    {
      icon: Droplets,
      title: "Line cleaning records",
      body: "Recurring line cleaning tasks with sign-off, so the record exists even when a different duty manager is on.",
    },
    {
      icon: ClipboardCheck,
      title: "Kitchen daily diary",
      body: "SFBB-style opening and closing checks with photo evidence, signed by the person who did the task.",
    },
    {
      icon: Wheat,
      title: "Allergens across a changing menu",
      body: "Specials and seasonal dishes get the same allergen rigour as the core menu, updated in minutes.",
    },
    {
      icon: Users,
      title: "Seasonal and casual staff",
      body: "Inductions, training certificates and fitness-to-work declarations tracked with expiry reminders.",
    },
    {
      icon: ShieldCheck,
      title: "One pack for the EHO",
      body: "Generate a dated evidence pack covering kitchen, cellar and bar in a single export.",
    },
  ],
  timeline: [
    "Day 1 — pick the pub template and confirm cellar, kitchen and bar equipment",
    "Day 2 — add duty managers, bar and kitchen teams with the right permissions",
    "Week 1 — kitchen diary, cellar checks and line cleaning running on rota",
    "Week 2 — allergen matrix and training records complete, inspection pack generated",
  ],
  faqs: [
    {
      question: "Can different teams see different checks?",
      answer:
        "Yes. Roles and permissions mean bar staff see bar and cellar tasks while kitchen staff see food safety checks, and managers see everything.",
    },
    {
      question: "Do you cover cellar and line cleaning?",
      answer:
        "Yes. Cellar temperature checks and recurring line cleaning tasks are scheduled and signed off like any other compliance record.",
    },
    {
      question: "We run frequent specials — is allergen updating painful?",
      answer:
        "No. Allergens are held at ingredient and recipe level, so a new special inherits allergen data from ingredients you have already recorded.",
    },
    {
      question: "Can head office see several pubs?",
      answer:
        "Yes. The Small Group plan covers up to three premises with a combined view of outstanding checks and alerts.",
    },
  ],
};

export const CARE_HOMES: IndustryContent = {
  slug: "care-homes-and-schools",
  eyebrow: "Care homes & schools",
  metaTitle: "Food Safety Software for UK Care Homes & School Kitchens — Haccora",
  title: "Food safety software for UK care homes and school kitchens",
  description:
    "Digital HACCP, cook-chill and regeneration temperature logs, allergen and texture-modified diet controls, cleaning schedules and audit evidence for UK care homes and school catering.",
  audience: "Care homes and school catering teams in the United Kingdom",
  intro:
    "Vulnerable diners raise the stakes on every record. Haccora holds cook, cool, regeneration and special-diet evidence to the standard inspectors and commissioners expect.",
  pains: [
    {
      icon: Thermometer,
      title: "Cook, cool and regeneration",
      body: "Time and temperature evidence for cook-chill and regeneration, with automatic corrective actions on failures.",
    },
    {
      icon: Wheat,
      title: "Allergens and special diets",
      body: "Allergen matrix alongside texture-modified and personalised diet requirements, visible to the whole kitchen team.",
    },
    {
      icon: ClipboardCheck,
      title: "Cleaning and sanitation schedules",
      body: "Recurring cleaning tasks by area with sign-off and photo evidence for audits.",
    },
    {
      icon: FileClock,
      title: "Audit and commissioner evidence",
      body: "Complete dated history retained under your retention policy, exportable for inspections and internal audit.",
    },
    {
      icon: Users,
      title: "Training and fitness to work",
      body: "Certificates, inductions and return-to-work declarations tracked with expiry reminders.",
    },
    {
      icon: ShieldCheck,
      title: "Incidents and complaints",
      body: "Record incidents, corrective actions and complaint outcomes in one accountable trail.",
    },
  ],
  timeline: [
    "Day 1 — pick the care or school catering template and confirm equipment and service points",
    "Day 2 — add the catering team, roles and training records",
    "Week 1 — cook, cool, regeneration and cleaning checks running to schedule",
    "Week 2 — allergen and special-diet controls signed off, audit pack generated",
  ],
  faqs: [
    {
      question: "Does Haccora handle texture-modified diets?",
      answer:
        "Yes. Personalised and texture-modified requirements sit alongside the allergen matrix so the kitchen sees one authoritative record per diner group.",
    },
    {
      question: "Can we keep records for longer retention periods?",
      answer:
        "Yes. Retention policies are configurable and records remain exportable for audits, commissioners and internal governance.",
    },
    {
      question: "Is it suitable for a multi-site catering contract?",
      answer:
        "Yes. Each kitchen has its own checks and equipment while managers see a combined view of overdue checks and alerts.",
    },
    {
      question: "How does it help during an inspection?",
      answer:
        "One tap produces a dated evidence pack covering your plan, monitoring records, corrective actions, cleaning and staff training.",
    },
  ],
};
