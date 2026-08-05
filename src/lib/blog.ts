import haccpImg from "@/assets/blog-haccp.jpg";
import cleaningImg from "@/assets/blog-cleaning.jpg";
import inspectionImg from "@/assets/blog-inspection.jpg";
import allergensImg from "@/assets/blog-allergens.jpg";

export interface BlogPost {
  slug: string;
  image: string;
  imageAlt: string;
  date: string;
  readMinutes: number;
  category: string;
  author: string;
  title: string;
  excerpt: string;
  body: BlogBlock[];
  tags: string[];
}

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; cite?: string };

export const posts: BlogPost[] = [
  {
    slug: "haccp-plan-uk-food-business-2026",
    image: haccpImg,
    imageAlt: "Chef checking a walk-in chiller temperature with a digital probe",
    date: "2026-06-14",
    readMinutes: 7,
    category: "HACCP",
    author: "Haccora Editorial",
    tags: ["HACCP", "Food safety management", "Due diligence"],
    title: "Build a structured HACCP-based plan — step by step",
    excerpt:
      "A practical UK starting point for documented hazard analysis, limits, monitoring and approval.",
    body: [
      {
        type: "p",
        text: "UK food businesses need food-safety management procedures based on HACCP principles, appropriate to the nature and size of the operation. Use the official guidance for your UK nation and obtain competent advice where needed.",
      },
      { type: "h2", text: "The seven HACCP principles in practice" },
      {
        type: "p",
        text: "Daily execution depends on clear documentation, accountability and sign-off. Haccora connects those steps, versions the plan and records human approval.",
      },
      {
        type: "ul",
        items: [
          "Hazard analysis for each process step, from goods-in to service",
          "Critical Control Points with clear, justified limits",
          "Monitoring with time, responsible person and measured value",
          "Corrective action and affected-product decisions",
          "Verification, review and versioned approval",
        ],
      },
      {
        type: "quote",
        text: "Structured evidence makes responsibilities, readings and corrections easier to explain during a local-authority visit.",
      },
    ],
  },
  {
    slug: "cleaning-schedule-that-passes-inspection",
    image: cleaningImg,
    imageAlt: "Food-business staff cleaning the kitchen line",
    date: "2026-05-22",
    readMinutes: 5,
    category: "Operations",
    author: "Haccora Editorial",
    tags: ["Cleaning", "Safe methods", "Verification"],
    title: "Cleaning schedules that work in a busy food business",
    excerpt: "Define the method, frequency, owner and verification—not only a tick box.",
    body: [
      {
        type: "p",
        text: "A useful cleaning record identifies what was cleaned, how it was cleaned, when it was completed and who checked the result. The schedule should reflect the actual premises and equipment.",
      },
      { type: "h2", text: "Frequency, responsibility and verification" },
      {
        type: "ul",
        items: [
          "After-use and daily food-contact surfaces",
          "Weekly filters, seals and difficult-to-reach areas",
          "Planned deep cleaning and contractor visits",
          "Corrective action where verification fails",
        ],
      },
    ],
  },
  {
    slug: "prepare-food-safety-inspection",
    image: inspectionImg,
    imageAlt: "Environmental health officer reviewing food-safety records",
    date: "2026-04-30",
    readMinutes: 6,
    category: "Inspection readiness",
    author: "Haccora Editorial",
    tags: ["Local authority", "Evidence", "Inspection"],
    title: "Prepare structured evidence for a food-safety inspection",
    excerpt:
      "Give an authorised reviewer controlled access to current evidence without exposing the whole account.",
    body: [
      {
        type: "p",
        text: "Local-authority visits may take place at short notice or without notice. Maintained records reduce searching, but software does not replace safe practice or competent review.",
      },
      { type: "h2", text: "A practical evidence checklist" },
      {
        type: "ul",
        items: [
          "Current, approved food-safety management plan",
          "Temperature records and resolved exceptions",
          "Cleaning, pest-control and maintenance evidence",
          "Training and fitness-to-work records",
          "Current allergen, PPDS and traceability information",
        ],
      },
    ],
  },
  {
    slug: "uk-14-allergens-and-ppds-labelling",
    image: allergensImg,
    imageAlt: "The 14 regulated allergen symbols beside recipe records",
    date: "2026-03-11",
    readMinutes: 5,
    category: "Allergens & PPDS",
    author: "Haccora Editorial",
    tags: ["Allergens", "PPDS", "Natasha's Law"],
    title: "Keep recipe, supplier and PPDS allergen information connected",
    excerpt:
      "A supplier substitution can affect recipes, menus and labels—connect the change to every affected record.",
    body: [
      {
        type: "p",
        text: "UK food businesses must provide accurate information about the 14 regulated allergens. Prepacked for direct sale food has additional ingredient-list and allergen-emphasis requirements.",
      },
      { type: "h2", text: "Control the source information" },
      {
        type: "p",
        text: "Haccora links declared allergens to recipes, ingredients and suppliers. A competent person must review substitutions and confirm affected recipes, menus and labels before use.",
      },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
