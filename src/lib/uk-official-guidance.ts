import type { UkJurisdiction } from "@/lib/uk-authorities";

export type UkFoodBusinessType =
  "caterer" | "retailer" | "manufacturer" | "mobile_caterer" | "institutional";

export type UkOfficialGuidance = {
  title: string;
  href: string;
  source: string;
  fit: string;
};

const SFBB = "https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb";
const FSA_NI = "https://www.food.gov.uk/business-guidance/food-safety-in-northern-ireland";
const SAFE_CATERING =
  "https://www.food.gov.uk/business-guidance/food-safety-management-procedures-for-food-businesses-in-northern-ireland";
const MY_HACCP = "https://myhaccp.food.gov.uk/";
const COOKSAFE =
  "https://www.foodstandards.gov.scot/business-guidance/running-a-food-business/publications/cooksafe-guide";
const RETAILSAFE =
  "https://www.foodstandards.gov.scot/business-guidance/running-a-food-business/publications/retailsafe";

const MANUFACTURER_GUIDANCE: UkOfficialGuidance = {
  title: "MyHACCP",
  href: MY_HACCP,
  source: "Food Standards Agency",
  fit: "A free UK tool aimed at small food manufacturers. Check its scope and seek competent advice for complex processes.",
};

/** Return an official starting point without implying that it approves a site's procedures. */
export function getUkOfficialGuidance(
  jurisdiction: UkJurisdiction,
  businessType: string,
): UkOfficialGuidance {
  if (businessType === "manufacturer") return MANUFACTURER_GUIDANCE;

  if (jurisdiction === "scotland") {
    if (businessType === "retailer") {
      return {
        title: "RetailSafe",
        href: RETAILSAFE,
        source: "Food Standards Scotland",
        fit: "Designed for retailers handling unwrapped high-risk foods. Contact your local authority if you are unsure it fits your operation.",
      };
    }
    if (["caterer", "mobile_caterer", "institutional"].includes(businessType)) {
      return {
        title: "CookSafe",
        href: COOKSAFE,
        source: "Food Standards Scotland",
        fit: "HACCP-based guidance for catering businesses in Scotland. Adapt it to your own processes.",
      };
    }
  }

  if (jurisdiction === "northern_ireland") {
    if (["caterer", "mobile_caterer", "institutional"].includes(businessType)) {
      return {
        title: "Safe Catering",
        href: SAFE_CATERING,
        source: "Food Standards Agency in Northern Ireland",
        fit: "Guidance for caterers and retailers with a catering function in Northern Ireland.",
      };
    }
    return {
      title: "Food safety guidance for Northern Ireland",
      href: FSA_NI,
      source: "Food Standards Agency in Northern Ireland",
      fit: "Start here for food-business guidance. Safe Catering is intended for caterers and retailers with a catering function.",
    };
  }

  if (businessType === "retailer") {
    return {
      title: "Safer Food, Better Business (retail pack)",
      href: SFBB,
      source: "Food Standards Agency",
      fit: "The FSA lists different packs by business type. Check the retailer pack's scope; specialist retailers may need different guidance.",
    };
  }

  if (["caterer", "mobile_caterer"].includes(businessType)) {
    return {
      title: "Safer Food, Better Business (caterer pack)",
      href: SFBB,
      source: "Food Standards Agency",
      fit: "England and Wales guidance with packs for different business types. Choose the pack that matches your premises and food operations.",
    };
  }

  return {
    title: "Safer Food, Better Business",
    href: SFBB,
    source: "Food Standards Agency",
    fit: "Review the available packs and confirm which approach fits your premises and food operations with your local authority if needed.",
  };
}
