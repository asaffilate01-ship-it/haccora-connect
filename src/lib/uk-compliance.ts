export const UK_COMPLIANCE_VERSION = "2026.08-stage-1";

export const UK_JURISDICTIONS = ["england", "wales", "northern_ireland", "scotland"] as const;
export type UkJurisdiction = (typeof UK_JURISDICTIONS)[number];

export const UK_ALLERGENS = [
  "Celery",
  "Cereals containing gluten",
  "Crustaceans",
  "Eggs",
  "Fish",
  "Lupin",
  "Milk",
  "Molluscs",
  "Mustard",
  "Tree nuts",
  "Peanuts",
  "Sesame",
  "Soya",
  "Sulphur dioxide and sulphites",
] as const;

export const UK_CONTROL_AREAS = [
  { key: "cross_contamination", title: "Cross-contamination", group: "4Cs" },
  { key: "cleaning", title: "Cleaning", group: "4Cs" },
  { key: "chilling", title: "Chilling", group: "4Cs" },
  { key: "cooking", title: "Cooking", group: "4Cs" },
  { key: "management", title: "Management and daily diary", group: "SFBB" },
  { key: "allergens", title: "Allergens and PPDS", group: "Allergens" },
  { key: "traceability", title: "Suppliers, traceability and recall", group: "Due diligence" },
  { key: "training", title: "Staff fitness, hygiene and training", group: "People" },
] as const;

export const UK_PRODUCT_DISCLAIMER =
  "Haccora supports a business's food-safety management and record keeping. It does not replace competent management, official guidance, an inspection or professional advice, and it does not guarantee a Food Hygiene Rating.";
