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
    {lang === "de" ? "Handelsregister" : "Company number / register"}:{" "}
    {PUBLIC_CONFIG.legal.register ?? "—"}
    <br />
    {lang === "de" ? "USt-IdNr." : "VAT ID"}: {PUBLIC_CONFIG.legal.vatId ?? "—"}
    <br />
    {lang === "de" ? "Geschäftsführung" : "Responsible company officer"}:{" "}
    {PUBLIC_CONFIG.legal.managingDirector ?? "—"}
  </address>
);

const UPDATED = "01.08.2026";

/* ── UK ENGLISH ─────────────────────────────────────────────────────────────── */
const en: Record<LegalKey, LegalDoc> = {
  imprint: {
    title: "Company information",
    updated: UPDATED,
    body: (
      <>
        <H>Company information</H>
        <Address lang="en" />
        <H>Contact</H>
        <P>Use the configured email or postal address for legal and customer-service notices.</P>
        <H>Liability for content</H>
        <P>
          We are responsible for content we publish. Links and third-party services remain subject
          to their own terms and responsibilities.
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
          <li>Complaint to the UK Information Commissioner’s Office.</li>
        </UL>
        <H>7. Cookies and tracking</H>
        <P>
          We only use strictly necessary cookies by default. Any non-necessary cookies (e.g.
          analytics) are only set after your consent under the Privacy and Electronic Communications
          Regulations. See "Cookies" for details.
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
          provider identified in the company information and the customer acting for business
          purposes.
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
          foreseeable damage. Nothing in these terms excludes liability that cannot lawfully be
          excluded under the laws of England and Wales.
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
          We currently use only technically necessary local storage and authentication mechanisms,
          in line with UK GDPR and the Privacy and Electronic Communications Regulations.
        </P>
        <H>Categories</H>
        <UL>
          <li>
            <strong>Necessary:</strong> language selection, login state and acknowledgement of this
            cookie notice. Used only where necessary to provide the requested service.
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
          directly to a the UK Information Commissioner’s Office.
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

export function legalContent(_lang: Language): Record<LegalKey, LegalDoc> {
  return en;
}
