export type UkJurisdiction = "england" | "wales" | "scotland" | "northern_ireland";

export type UkAuthorityProfile = {
  label: string;
  regulator: string;
  ratingScheme: string;
  authorityLabel: string;
  registrationUrl: string;
  guidanceUrl: string;
  ratingUrl: string;
};

export const UK_AUTHORITY_PROFILES: Record<UkJurisdiction, UkAuthorityProfile> = {
  england: {
    label: "England",
    regulator: "Food Standards Agency (FSA)",
    ratingScheme: "Food Hygiene Rating Scheme (FHRS)",
    authorityLabel: "Local council food safety team",
    registrationUrl: "https://www.gov.uk/food-business-registration",
    guidanceUrl: "https://www.food.gov.uk/business-guidance",
    ratingUrl: "https://ratings.food.gov.uk/",
  },
  wales: {
    label: "Wales",
    regulator: "Food Standards Agency (FSA)",
    ratingScheme: "Food Hygiene Rating Scheme (FHRS)",
    authorityLabel: "Local authority food safety team",
    registrationUrl: "https://www.gov.uk/food-business-registration",
    guidanceUrl: "https://www.food.gov.uk/business-guidance",
    ratingUrl: "https://ratings.food.gov.uk/",
  },
  scotland: {
    label: "Scotland",
    regulator: "Food Standards Scotland (FSS)",
    ratingScheme: "Food Hygiene Information Scheme (FHIS)",
    authorityLabel: "Local authority environmental health service",
    registrationUrl: "https://www.mygov.scot/food-business-registration",
    guidanceUrl: "https://www.foodstandards.gov.scot/business-and-industry",
    ratingUrl: "https://www.foodstandards.gov.scot/consumers/food-safety/eating-out/fhis",
  },
  northern_ireland: {
    label: "Northern Ireland",
    regulator: "Food Standards Agency in Northern Ireland",
    ratingScheme: "Food Hygiene Rating Scheme (FHRS)",
    authorityLabel: "District council environmental health team",
    registrationUrl:
      "https://www.nidirect.gov.uk/articles/registering-food-business-and-other-food-hygiene-requirements",
    guidanceUrl: "https://www.food.gov.uk/business-guidance/food-safety-in-northern-ireland",
    ratingUrl: "https://ratings.food.gov.uk/",
  },
};

export function isUkJurisdiction(value: string): value is UkJurisdiction {
  return value in UK_AUTHORITY_PROFILES;
}
