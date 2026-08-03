import type { ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import { PUBLIC_CONFIG, legalIdentityComplete } from "@/lib/public-config";

export type LegalKey = "imprint" | "privacy" | "terms" | "cookies" | "complaints";
export interface LegalDoc {
  title: string;
  updated: string;
  body: ReactNode;
}

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="display-black text-2xl md:text-3xl mt-10 first:mt-0">{children}</h2>
);
const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 text-[15px] leading-relaxed text-black/75">{children}</p>
);
const UL = ({ children }: { children: ReactNode }) => (
  <ul className="mt-3 space-y-1.5 list-disc pl-5 text-[15px] text-black/75">{children}</ul>
);
type LegalField = keyof typeof PUBLIC_CONFIG.legal;
const ConfiguredLegalValue = ({ field, fallback }: { field: LegalField; fallback: string }) => (
  <>{PUBLIC_CONFIG.legal[field] ?? fallback}</>
);
const ConfiguredLegalAddress = ({
  fallback,
  separator = ", ",
  includeEmail = false,
}: {
  fallback: string;
  separator?: string;
  includeEmail?: boolean;
}) => {
  const values = [
    PUBLIC_CONFIG.legal.companyName,
    PUBLIC_CONFIG.legal.addressLine1,
    PUBLIC_CONFIG.legal.postalCity,
    ...(includeEmail ? [PUBLIC_CONFIG.legal.email] : []),
  ];
  return <>{values.filter(Boolean).join(separator) || fallback}</>;
};
const Address = ({ lang = "de" }: { lang?: Language }) => (
  <address className="not-italic mt-3 text-[15px] text-black/75">
    {!legalIdentityComplete && (
      <strong className="block rounded-lg bg-destructive/10 p-3 text-destructive">
        {lang === "de"
          ? "Nicht veröffentlichen: Rechtsträgerdaten fehlen in der Produktionskonfiguration."
          : "Do not publish: legal entity details are missing from production configuration."}
      </strong>
    )}
    {PUBLIC_CONFIG.legal.companyName ?? "—"}
    <br />
    {PUBLIC_CONFIG.legal.addressLine1 ?? "—"}
    <br />
    {PUBLIC_CONFIG.legal.postalCity ?? "—"}
    <br />
    <br />
    {lang === "de" ? "E-Mail" : "Email"}: {PUBLIC_CONFIG.legal.email ?? "—"}
    <br />
    {lang === "de" ? "Tel." : "Phone"}: {PUBLIC_CONFIG.legal.phone ?? "—"}
    <br />
    {lang === "de" ? "Handelsregister" : "Commercial register"}:{" "}
    {PUBLIC_CONFIG.legal.register ?? "—"}
    <br />
    {lang === "de" ? "USt-IdNr." : "VAT ID"}: {PUBLIC_CONFIG.legal.vatId ?? "—"}
    <br />
    {lang === "de" ? "Geschäftsführung" : "Managing director"}:{" "}
    {PUBLIC_CONFIG.legal.managingDirector ?? "—"}
    <br />
    {lang === "de"
      ? "Verantwortlich i.S.d. § 18 Abs. 2 MStV"
      : "Responsible under § 18 (2) MStV"}: {PUBLIC_CONFIG.legal.managingDirector ?? "—"}
  </address>
);

const UPDATED = "01.08.2026";

/* ── DE ─────────────────────────────────────────────────────────────── */
const de: Record<LegalKey, LegalDoc> = {
  imprint: {
    title: "Impressum",
    updated: UPDATED,
    body: (
      <>
        <H>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</H>
        <Address />
        <H>Streitbeilegung</H>
        <P>
          Die frühere EU-Plattform zur Online-Streitbeilegung wurde eingestellt. Zur Teilnahme an
          einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir weder
          verpflichtet noch bereit.
        </P>
        <H>Haftung für Inhalte</H>
        <P>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen.
        </P>
      </>
    ),
  },
  privacy: {
    title: "Datenschutzerklärung",
    updated: UPDATED,
    body: (
      <>
        <P>
          Dieser Entwurf beschreibt die Nutzung der Haccora-Plattform und der öffentlich
          konfigurierten Website. Er muss vor Veröffentlichung an die tatsächlichen Datenflüsse,
          Anbieter und Rechtsgrundlagen angepasst und rechtlich freigegeben werden.
        </P>
        <H>1. Verantwortlicher</H>
        <Address />
        <H>2. Datenschutzbeauftragter</H>
        <P>
          Den Datenschutzkontakt erreichen Sie über die im Impressum konfigurierte E-Mail-Adresse.
          Angaben zu einem bestellten Datenschutzbeauftragten werden vor Veröffentlichung ergänzt.
        </P>
        <H>3. Verarbeitete Daten und Zwecke</H>
        <UL>
          <li>
            Stammdaten (Name, E-Mail, Rolle, Standort) – zur Vertragserfüllung, Art. 6 Abs. 1 lit. b
            DSGVO.
          </li>
          <li>
            Nutzungsdaten (Aufgaben, HACCP-Nachweise, Temperaturen) – zur Erbringung der
            Compliance-Dokumentation, Art. 6 Abs. 1 lit. b und c DSGVO.
          </li>
          <li>
            Log- und Sicherheitsdaten – berechtigtes Interesse an Betriebssicherheit, Art. 6 Abs. 1
            lit. f DSGVO.
          </li>
          <li>Kontaktformular-Daten – Bearbeitung Ihrer Anfrage, Art. 6 Abs. 1 lit. b/f DSGVO.</li>
        </UL>
        <H>4. Empfänger und Auftragsverarbeitung</H>
        <P>
          Die tatsächlich eingesetzten Auftragsverarbeiter, Verarbeitungsorte, Verträge nach Art. 28
          DSGVO und gegebenenfalls Garantien für Drittlandtransfers werden vor Veröffentlichung in
          der finalen Fassung vollständig aufgeführt.
        </P>
        <H>5. Speicherdauer</H>
        <P>
          Vor dem Start wird für jede Datenkategorie ein geprüftes Lösch- und Aufbewahrungskonzept
          hinterlegt. Es berücksichtigt Vertragszwecke, Betroffenenrechte sowie tatsächlich
          anwendbare lebensmittel-, handels- und steuerrechtliche Pflichten.
        </P>
        <H>6. Ihre Rechte</H>
        <UL>
          <li>Auskunft (Art. 15 DSGVO)</li>
          <li>Berichtigung (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch (Art. 21 DSGVO)</li>
          <li>Beschwerde bei einer zuständigen Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO).</li>
        </UL>
        <H>7. Cookies und Tracking</H>
        <P>
          Wir verwenden ausschließlich technisch notwendige Cookies. Alle nicht notwendigen Cookies
          (z. B. Analytics) werden erst nach Ihrer Einwilligung nach § 25 Abs. 1 TDDDG gesetzt.
          Details unter „Cookies".
        </P>
      </>
    ),
  },
  terms: {
    title: "Allgemeine Geschäftsbedingungen (AGB)",
    updated: UPDATED,
    body: (
      <>
        <H>§ 1 Geltungsbereich</H>
        <P>
          Diese AGB gelten für alle Verträge über die Nutzung der Software-as-a-Service Lösung
          „Haccora" zwischen dem im Impressum genannten Anbieter und dem Kunden. Der Kunde handelt
          als Unternehmer i.S.d. § 14 BGB.
        </P>
        <H>§ 2 Leistungsumfang</H>
        <P>
          Der Anbieter stellt Haccora als webbasierte Anwendung zur Verfügung. Der konkrete
          Funktionsumfang richtet sich nach dem gewählten Tarif. Eine Garantie der Rechtskonformität
          einzelner Nachweise wird nicht übernommen; die Verantwortung für lebensmittelrechtliche
          Pflichten verbleibt beim Kunden.
        </P>
        <H>§ 3 Vertragslaufzeit und Kündigung</H>
        <P>
          Laufzeit, Verlängerung und Kündigungsfristen ergeben sich aus dem angenommenen Angebot
          oder Auftrag. Das Recht zur außerordentlichen Kündigung bleibt unberührt.
        </P>
        <H>§ 4 Vergütung, Zahlungsbedingungen</H>
        <P>
          Es gelten die im angenommenen Angebot oder Auftrag vereinbarten Preise, Steuern,
          Zahlungswege und Fälligkeiten.
        </P>
        <H>§ 5 Pflichten des Kunden</H>
        <UL>
          <li>Wahrheitsgemäße Angaben bei Registrierung und Pflege der Daten.</li>
          <li>Sichere Aufbewahrung der Zugangsdaten.</li>
          <li>Einhaltung des einschlägigen Lebensmittel- und Datenschutzrechts.</li>
        </UL>
        <H>§ 6 Verfügbarkeit</H>
        <P>
          Verfügbarkeit, Wartungsfenster und gegebenenfalls Service-Level ergeben sich aus dem
          angenommenen Angebot oder einer gesonderten SLA-Vereinbarung.
        </P>
        <H>§ 7 Haftung</H>
        <P>
          Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei
          Verletzung von Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit ist die Haftung
          auf den typischerweise vorhersehbaren Schaden begrenzt. Die Haftung nach dem
          Produkthaftungsgesetz bleibt unberührt.
        </P>
        <H>§ 8 Schlussbestimmungen</H>
        <P>
          Anwendbares Recht und Gerichtsstand werden in der finalen, rechtlich freigegebenen Fassung
          anhand des tatsächlichen Sitzes des Anbieters festgelegt.
        </P>
      </>
    ),
  },
  cookies: {
    title: "Cookie-Richtlinie",
    updated: UPDATED,
    body: (
      <>
        <P>
          Wir setzen derzeit nur technisch erforderliche lokale Speicher- und
          Authentifizierungsmechanismen ein (§ 25 Abs. 2 Nr. 2 TDDDG).
        </P>
        <H>Kategorien</H>
        <UL>
          <li>
            <strong>Notwendig:</strong> Sprachauswahl, Anmeldestatus und Anzeige der
            Cookie-Information. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG.
          </li>
          <li>
            <strong>Marketing:</strong> Aktuell nicht eingesetzt.
          </li>
        </UL>
        <H>Verwaltung</H>
        <P>
          Über Ihren Browser lassen sich Cookies und lokale Website-Daten zusätzlich blockieren oder
          löschen.
        </P>
      </>
    ),
  },
  complaints: {
    title: "Beschwerdeverfahren",
    updated: UPDATED,
    body: (
      <>
        <P>
          Wir nehmen Beschwerden ernst. Diese Richtlinie beschreibt, wie Sie Kritik, Anregungen oder
          Beschwerden – auch anonym – an uns richten können.
        </P>
        <H>1. Kontaktwege</H>
        <UL>
          <li>
            E-Mail:{" "}
            <ConfiguredLegalValue field="email" fallback="vor Veröffentlichung konfigurieren" />
          </li>
          <li>
            Post: <ConfiguredLegalAddress fallback="vor Veröffentlichung konfigurieren" />
          </li>
          <li>
            Telefon:{" "}
            <ConfiguredLegalValue field="phone" fallback="vor Veröffentlichung konfigurieren" />
          </li>
        </UL>
        <H>2. Bearbeitungsfristen</H>
        <P>
          Verbindliche Reaktions- und Eskalationszeiten werden vor dem Start anhand der
          tatsächlichen Supportkapazität und der Kundenverträge festgelegt.
        </P>
        <H>3. Eskalation</H>
        <P>
          Sind Sie mit dem Ergebnis nicht einverstanden, können Sie den Fall an die Geschäftsführung
          über den im Impressum genannten Kontakt eskalieren. Datenschutzbeschwerden können Sie
          zusätzlich direkt bei einer zuständigen Datenschutz-Aufsichtsbehörde einreichen.
        </P>
        <H>4. Hinweisgeberschutz</H>
        <P>
          Falls die gesetzlichen Voraussetzungen für eine interne Meldestelle vorliegen, wird vor
          dem Start ein dafür geeignetes, vertrauliches Meldeverfahren mit eigenen Kontaktdaten
          veröffentlicht. Das allgemeine Kontaktformular ersetzt dieses Verfahren nicht.
        </P>
      </>
    ),
  },
};

/* ── EN ─────────────────────────────────────────────────────────────── */
const en: Record<LegalKey, LegalDoc> = {
  imprint: {
    title: "Imprint",
    updated: UPDATED,
    body: (
      <>
        <H>Information according to § 5 DDG (German Digital Services Act)</H>
        <Address lang="en" />
        <H>Online dispute resolution</H>
        <P>
          The former EU online dispute resolution platform has been discontinued. We are neither
          obliged nor willing to participate in dispute resolution proceedings before a consumer
          arbitration board.
        </P>
        <H>Liability for content</H>
        <P>
          As a service provider, we are responsible for our own content on these pages under § 7 (1)
          DDG. According to §§ 8 to 10 DDG, we are not obliged to monitor transmitted or stored
          third-party information.
        </P>
      </>
    ),
  },
  privacy: {
    title: "Privacy notice (GDPR)",
    updated: UPDATED,
    body: (
      <>
        <P>
          This draft describes use of the Haccora platform and the configured public website. Before
          publication it must be aligned with the actual data flows, providers and legal bases, then
          approved by qualified counsel.
        </P>
        <H>1. Controller</H>
        <address className="not-italic mt-3 text-[15px] text-black/75">
          <ConfiguredLegalAddress
            fallback="Legal identity must be configured before publication"
            separator=" · "
            includeEmail
          />
        </address>
        <H>2. Data protection officer</H>
        <P>
          The privacy contact is available at the email address configured in the imprint. Details
          of an appointed data protection officer will be added before publication.
        </P>
        <H>3. Data we process and purposes</H>
        <UL>
          <li>
            Master data (name, email, role, location) — contract performance, Art. 6(1)(b) GDPR.
          </li>
          <li>
            Usage data (tasks, HACCP records, temperatures) — compliance documentation, Art. 6(1)(b)
            and (c) GDPR.
          </li>
          <li>
            Log and security data — legitimate interest in operational security, Art. 6(1)(f) GDPR.
          </li>
          <li>Contact form data — handling your enquiry, Art. 6(1)(b)/(f) GDPR.</li>
        </UL>
        <H>4. Recipients and processors</H>
        <P>
          The final version will list the processors actually used, processing locations, Art. 28
          GDPR agreements and any safeguards for international transfers before publication.
        </P>
        <H>5. Retention</H>
        <P>
          A reviewed retention and deletion schedule will be configured for every data category
          before launch, reflecting contract purposes, data-subject rights and the legal obligations
          that actually apply.
        </P>
        <H>6. Your rights</H>
        <UL>
          <li>Access (Art. 15 GDPR)</li>
          <li>Rectification (Art. 16 GDPR)</li>
          <li>Erasure (Art. 17 GDPR)</li>
          <li>Restriction (Art. 18 GDPR)</li>
          <li>Portability (Art. 20 GDPR)</li>
          <li>Objection (Art. 21 GDPR)</li>
          <li>Complaint with a competent data-protection supervisory authority (Art. 77 GDPR).</li>
        </UL>
        <H>7. Cookies and tracking</H>
        <P>
          We only use strictly necessary cookies by default. Any non-necessary cookies (e.g.
          analytics) are only set after your consent under § 25(1) TDDDG. See "Cookies" for details.
        </P>
      </>
    ),
  },
  terms: {
    title: "Terms and Conditions",
    updated: UPDATED,
    body: (
      <>
        <H>§ 1 Scope</H>
        <P>
          These T&Cs govern all contracts for the use of the SaaS solution "Haccora" between the
          provider identified in the imprint and the customer, who acts as an entrepreneur within
          the meaning of § 14 BGB.
        </P>
        <H>§ 2 Scope of services</H>
        <P>
          The Provider makes Haccora available as a web application. The specific feature set
          depends on the chosen plan. No guarantee of legal compliance of individual records is
          given; responsibility for food-law obligations remains with the customer.
        </P>
        <H>§ 3 Term and termination</H>
        <P>
          Term, renewal and notice periods are set out in the accepted quote or order. The right to
          extraordinary termination remains unaffected.
        </P>
        <H>§ 4 Fees and payment</H>
        <P>
          Prices, taxes, payment methods and due dates are those agreed in the accepted quote or
          order.
        </P>
        <H>§ 5 Customer obligations</H>
        <UL>
          <li>Truthful information on registration and data upkeep.</li>
          <li>Secure storage of access credentials.</li>
          <li>Compliance with applicable food and data protection law.</li>
        </UL>
        <H>§ 6 Availability</H>
        <P>
          Availability, maintenance windows and any service levels are set out in the accepted quote
          or a separate SLA.
        </P>
        <H>§ 7 Liability</H>
        <P>
          The Provider is liable without limitation for intent and gross negligence and for injury
          to life, body and health. For simple negligence, liability is limited to typically
          foreseeable damage. Liability under the German Product Liability Act remains unaffected.
        </P>
        <H>§ 8 Final provisions</H>
        <P>
          Applicable law and jurisdiction will be set in the final legally approved version using
          the provider's actual registered location.
        </P>
      </>
    ),
  },
  cookies: {
    title: "Cookie Policy",
    updated: UPDATED,
    body: (
      <>
        <P>
          We currently use only technically necessary local-storage and authentication mechanisms (§
          25(2)(2) TDDDG).
        </P>
        <H>Categories</H>
        <UL>
          <li>
            <strong>Necessary:</strong> language selection, login state and acknowledgement of this
            cookie notice. Legal basis: § 25(2)(2) TDDDG.
          </li>
          <li>
            <strong>Marketing:</strong> not currently used.
          </li>
        </UL>
        <H>Managing your choices</H>
        <P>Cookies and local website data can be blocked or deleted in your browser.</P>
      </>
    ),
  },
  complaints: {
    title: "Complaints procedure",
    updated: UPDATED,
    body: (
      <>
        <P>
          We take complaints seriously. This policy explains how you can send us criticism,
          suggestions or complaints — including anonymously.
        </P>
        <H>1. How to reach us</H>
        <UL>
          <li>
            Email: <ConfiguredLegalValue field="email" fallback="configure before publication" />
          </li>
          <li>
            Post: <ConfiguredLegalAddress fallback="configure before publication" />
          </li>
          <li>
            Phone: <ConfiguredLegalValue field="phone" fallback="configure before publication" />
          </li>
        </UL>
        <H>2. Response times</H>
        <P>
          Binding response and escalation times will be set before launch using the actual support
          capacity and customer contracts.
        </P>
        <H>3. Escalation</H>
        <P>
          If you are not satisfied with the outcome, you can escalate the matter to management using
          the contact named in the imprint. Data protection complaints can also be submitted
          directly to a competent data-protection supervisory authority.
        </P>
        <H>4. Whistleblower protection</H>
        <P>
          If the statutory conditions for an internal reporting channel apply, a suitable
          confidential process with dedicated contact details will be published before launch. The
          general contact form does not replace that process.
        </P>
      </>
    ),
  },
};

export function legalContent(lang: Language): Record<LegalKey, LegalDoc> {
  return lang === "de" ? de : en;
}
