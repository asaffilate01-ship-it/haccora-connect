import haccpImg from "@/assets/blog-haccp.jpg";
import cleaningImg from "@/assets/blog-cleaning.jpg";
import inspectionImg from "@/assets/blog-inspection.jpg";
import allergensImg from "@/assets/blog-allergens.jpg";

export type Language = "de" | "en";

export interface BlogPost {
  slug: string;
  image: string;
  imageAlt: { de: string; en: string };
  date: string; // ISO
  readMinutes: number;
  category: { de: string; en: string };
  author: string;
  title: { de: string; en: string };
  excerpt: { de: string; en: string };
  /** Rich body as ordered blocks. */
  body: {
    de: BlogBlock[];
    en: BlogBlock[];
  };
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
    imageAlt: {
      de: "Küchenchef prüft die Kühlraumtemperatur mit einem digitalen Thermometer",
      en: "Chef checking walk-in cooler temperature with a digital probe",
    },
    date: "2026-06-14",
    readMinutes: 7,
    category: { de: "HACCP", en: "HACCP" },
    author: "Haccora Editorial",
    tags: ["HACCP", "Food-handler health", "food hygiene"],
    title: {
      de: "Einen HACCP-basierten Plan strukturiert aufbauen – Schritt für Schritt",
      en: "Build a structured HACCP-based plan — step by step",
    },
    excerpt: {
      de: "Ein praktischer Ausgangspunkt für dokumentierte Gefahrenanalyse, Grenzwerte, Überwachung und Freigabe.",
      en: "A practical starting point for documented hazard analysis, limits, monitoring and approval.",
    },
    body: {
      de: [
        {
          type: "p",
          text: "Lebensmittelunternehmen müssen nach Verordnung (EG) Nr. 852/2004 grundsätzlich HACCP-gestützte Verfahren einrichten, durchführen und aufrechterhalten. Wie dies für Ihren Betrieb konkret dokumentiert wird, sollte mit der zuständigen Fachperson oder Behörde geklärt werden.",
        },
        { type: "h2", text: "Die 7 HACCP-Grundsätze in der Praxis" },
        {
          type: "p",
          text: "Die Grundsätze sind bekannt – im Alltag zählen klare Dokumentation, Verantwortlichkeit und Freigabe. Haccora strukturiert diese Schritte, versioniert den Plan und zeichnet die menschliche Freigabe auf.",
        },
        {
          type: "ul",
          items: [
            "Gefahrenanalyse pro Prozessschritt (Wareneingang → Ausgabe)",
            "Kritische Kontrollpunkte (CCP) mit klaren Grenzwerten",
            "Überwachung mit Uhrzeit, Person und Messwert",
            "Korrekturmaßnahmen mit Ursachenanalyse",
            "Verifizierung durch interne Audits",
            "Versionierte, exportierbare Dokumentation",
            "Regelmäßige Überprüfung des Plans",
          ],
        },
        {
          type: "quote",
          text: "Gut strukturierte Nachweise erleichtern es, Zuständigkeiten, Messwerte und Korrekturen nachvollziehbar zu erklären.",
        },
        { type: "h2", text: "Was ändert sich 2026?" },
        {
          type: "p",
          text: "Klären Sie das gewünschte Format mit Ihrer zuständigen Behörde. Haccora kann ausgewählte Nachweise zeitlich begrenzt als Nur-Lese-Ansicht oder als PDF-Paket bereitstellen.",
        },
      ],
      en: [
        {
          type: "p",
          text: "Under Regulation (EC) No 852/2004, food businesses generally need to establish, implement and maintain HACCP-based procedures. Confirm the documentation appropriate to your operation with a qualified specialist or the competent authority.",
        },
        { type: "h2", text: "The 7 HACCP principles in practice" },
        {
          type: "p",
          text: "The principles are well known — daily execution depends on clear documentation, accountability and sign-off. Haccora structures those steps, versions the plan and records human approval.",
        },
        {
          type: "ul",
          items: [
            "Hazard analysis per process step (goods-in → service)",
            "Critical Control Points (CCP) with clear limits",
            "Monitoring with time, person and value",
            "Corrective actions with root-cause analysis",
            "Verification via internal audits",
            "Versioned, exportable documentation",
            "Regular review of the plan",
          ],
        },
        {
          type: "quote",
          text: "Well-structured evidence makes responsibilities, readings and corrections easier to explain and verify.",
        },
        { type: "h2", text: "What changes in 2026?" },
        {
          type: "p",
          text: "Confirm the preferred format with the competent authority. Haccora can make selected evidence available through a time-limited read-only view or a PDF pack.",
        },
      ],
    },
  },
  {
    slug: "cleaning-schedule-that-passes-inspection",
    image: cleaningImg,
    imageAlt: {
      de: "Personal reinigt frühmorgens die Küchenlinie",
      en: "Staff cleaning the kitchen line at dawn",
    },
    date: "2026-05-22",
    readMinutes: 5,
    category: { de: "Betrieb", en: "Operations" },
    author: "Haccora Editorial",
    tags: ["Reinigung", "SOP", "food hygiene"],
    title: {
      de: "Reinigungspläne, die im Küchenalltag funktionieren",
      en: "Cleaning plans that work in daily kitchen operations",
    },
    excerpt: {
      de: "Von der Frequenz bis zur Kontrolle: So bauen Sie einen Reinigungsplan, der auch im Trubel funktioniert.",
      en: "From frequency to verification: how to build a cleaning plan that works even in the weeds.",
    },
    body: {
      de: [
        {
          type: "p",
          text: "Unvollständige Reinigungsnachweise erschweren die interne Kontrolle und die Erklärung Ihrer Abläufe gegenüber Dritten.",
        },
        { type: "h2", text: "Frequenz, Verantwortung, Kontrolle" },
        {
          type: "p",
          text: "Für jede Fläche sollten Häufigkeit, verantwortliche Person und Kontrollschritt festgelegt werden. Haccora erfasst die daraus abgeleiteten Kontrollen als nachvollziehbare Aufgaben.",
        },
        {
          type: "ul",
          items: [
            "Tägliche Punkte (Arbeitsflächen, Böden, Handkontaktflächen)",
            "Wöchentliche Punkte (Abzugshauben-Filter, Kühlraumdichtungen)",
            "Monatliche Punkte (Tiefenreinigung, Fettabscheider)",
          ],
        },
      ],
      en: [
        {
          type: "p",
          text: "Incomplete cleaning evidence makes internal verification and third-party review of your processes harder.",
        },
        { type: "h2", text: "Frequency, responsibility, verification" },
        {
          type: "p",
          text: "For each surface, define the frequency, responsible person and verification step. Haccora records the resulting controls as traceable tasks.",
        },
        {
          type: "ul",
          items: [
            "Daily items (work surfaces, floors, hand-contact points)",
            "Weekly items (hood filters, cooler gaskets)",
            "Monthly items (deep clean, grease traps)",
          ],
        },
      ],
    },
  },
  {
    slug: "prepare-food-safety-inspection",
    image: inspectionImg,
    imageAlt: {
      de: "Lebensmittelkontrolleur mit Klemmbrett bei der Prüfung",
      en: "Food safety inspector with clipboard during a visit",
    },
    date: "2026-04-30",
    readMinutes: 6,
    category: { de: "Regulatorik", en: "Regulation" },
    author: "Haccora Editorial",
    tags: ["Inspection", "Food-handler health"],
    title: {
      de: "Nachweise für eine Lebensmittelkontrolle strukturiert vorbereiten",
      en: "Prepare structured evidence for a food safety inspection",
    },
    excerpt: {
      de: "Inspector Mode begrenzt den Zugriff auf ausgewählte Nachweise, Standorte und Zeiträume.",
      en: "Inspector Mode limits access to selected evidence, locations and time periods.",
    },
    body: {
      de: [
        {
          type: "p",
          text: "Kontrollen können kurzfristig oder unangekündigt stattfinden. Eine gepflegte, strukturierte Ablage reduziert dann die Sucharbeit, ersetzt aber keine fachliche Prüfung Ihrer Unterlagen.",
        },
        { type: "h2", text: "Die Checkliste vor dem Termin" },
        {
          type: "ul",
          items: [
            "HACCP-Plan aktuell und freigegeben",
            "Temperaturprotokolle der letzten 30 Tage",
            "Reinigungsnachweise der letzten Woche",
            "Schulungsnachweise nach Food-handler fitness-to-work",
            "Allergen- und Zusatzstoffkennzeichnung aktuell",
          ],
        },
      ],
      en: [
        {
          type: "p",
          text: "Inspections may take place at short notice or without notice. Maintained, structured records reduce searching but do not replace specialist review of your evidence.",
        },
        { type: "h2", text: "The pre-visit checklist" },
        {
          type: "ul",
          items: [
            "HACCP plan current and approved",
            "Temperature logs for the last 30 days",
            "Cleaning evidence for the last week",
            "Training records per Food-handler fitness-to-work",
            "Allergen and additive labelling current",
          ],
        },
      ],
    },
  },
  {
    slug: "eu-14-allergens-labelling",
    image: allergensImg,
    imageAlt: {
      de: "14 EU-Allergen-Symbole auf Marmorarbeitsplatte",
      en: "14 EU allergen symbols on a marble counter",
    },
    date: "2026-03-11",
    readMinutes: 4,
    category: { de: "Rezepte", en: "Recipes" },
    author: "Haccora Editorial",
    tags: ["Allergens", "LMIV"],
    title: {
      de: "14 EU-Hauptallergene strukturiert je Rezept pflegen",
      en: "Maintain the 14 EU major allergens for each recipe",
    },
    excerpt: {
      de: "Rezepte, Zutaten und Lieferantenwechsel – warum manuelle Allergenlisten in Deutschland gefährlich sind.",
      en: "Recipes, ingredients, supplier changes — why manual allergen lists are risky in United Kingdom.",
    },
    body: {
      de: [
        {
          type: "p",
          text: "Die LMIV verpflichtet Sie, alle 14 EU-Hauptallergene korrekt und aktuell auszuweisen. Ein Wechsel von einer Sauce reicht, um Ihre gesamte Karte veraltet zu machen.",
        },
        { type: "h2", text: "So löst Haccora das" },
        {
          type: "p",
          text: "Haccora speichert deklarierte Allergene je Rezept und bietet Datenmodelle für Zutaten- und Lieferantenbezüge. Änderungen müssen vor Veröffentlichung fachlich geprüft und in den betroffenen Rezepten bestätigt werden.",
        },
      ],
      en: [
        {
          type: "p",
          text: "EU FIC obliges you to declare all 14 major allergens correctly and up to date. A single sauce swap is enough to make your entire menu outdated.",
        },
        { type: "h2", text: "How Haccora solves it" },
        {
          type: "p",
          text: "Haccora stores declared allergens for each recipe and provides data models for ingredient and supplier links. Changes must be reviewed by a qualified person and confirmed in affected recipes before publication.",
        },
      ],
    },
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatDate(iso: string, lang: Language) {
  return new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
