import type { ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import { PUBLIC_CONFIG, TRADING_STATEMENT, legalIdentityComplete } from "@/lib/public-config";

export type LegalKey =
  "company" | "privacy" | "terms" | "cookies" | "dataProcessing" | "accessibility" | "complaints";

export interface LegalDoc {
  title: string;
  updated: string;
  body: ReactNode;
}

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-9 first:mt-0 text-xl font-black tracking-tight md:text-2xl">{children}</h2>
);
const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 text-sm leading-6 text-black/75">{children}</p>
);
const UL = ({ children }: { children: ReactNode }) => (
  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-black/75">{children}</ul>
);
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="font-semibold underline underline-offset-2" href={href} rel="noreferrer">
    {children}
  </a>
);

type LegalField = keyof typeof PUBLIC_CONFIG.legal;
const ConfiguredLegalValue = ({ field, fallback }: { field: LegalField; fallback: string }) => (
  <>{PUBLIC_CONFIG.legal[field] ?? fallback}</>
);
const ConfiguredLegalAddress = ({ includeEmail = false }: { includeEmail?: boolean }) => {
  const values = [
    PUBLIC_CONFIG.legal.companyName,
    PUBLIC_CONFIG.legal.addressLine1,
    PUBLIC_CONFIG.legal.postalCity,
    ...(includeEmail ? [PUBLIC_CONFIG.legal.email] : []),
  ];
  return <>{values.filter(Boolean).join(" · ") || "Configure the legal identity before launch"}</>;
};

const CompanyAddress = () => (
  <address className="mt-3 not-italic text-sm leading-6 text-black/75">
    {!legalIdentityComplete && (
      <strong className="mb-4 block rounded-lg bg-destructive/10 p-3 text-destructive">
        Do not publish: the production legal identity is incomplete.
      </strong>
    )}
    <strong>{PUBLIC_CONFIG.legal.companyName ?? "Legal company name not configured"}</strong>
    <br />
    {TRADING_STATEMENT}
    <br />
    {PUBLIC_CONFIG.legal.addressLine1 ?? "Registered office not configured"}
    <br />
    {PUBLIC_CONFIG.legal.postalCity ?? "Postcode and town/city not configured"}
    <br />
    <br />
    Registered in: {PUBLIC_CONFIG.legal.registeredIn ?? "Not configured"}
    <br />
    Company number: {PUBLIC_CONFIG.legal.companyNumber ?? "Not configured"}
    <br />
    {PUBLIC_CONFIG.legal.vatId && (
      <>
        VAT registration number: {PUBLIC_CONFIG.legal.vatId}
        <br />
      </>
    )}
    {PUBLIC_CONFIG.legal.icoRegistration && (
      <>
        ICO registration reference: {PUBLIC_CONFIG.legal.icoRegistration}
        <br />
      </>
    )}
    Email: {PUBLIC_CONFIG.legal.email ?? "Not configured"}
    <br />
    Phone: {PUBLIC_CONFIG.legal.phone ?? "Not configured"}
  </address>
);

const UPDATED = "9 August 2026";

const content: Record<LegalKey, LegalDoc> = {
  company: {
    title: "Company details",
    updated: UPDATED,
    body: (
      <>
        <P>
          Haccora is a UK business-to-business software service. The provider and contact details
          below apply to the Haccora website, web application and mobile applications.
        </P>
        <H>Service provider</H>
        <CompanyAddress />
        <H>Customer and legal notices</H>
        <P>
          Send customer-service, contractual and legal notices to the email or registered-office
          address above. Include your organisation name and account email so the request can be
          routed securely.
        </P>
        <H>Trading disclosure</H>
        <P>
          These details must be checked against the live Companies House record before publication
          and after any company change.
        </P>
      </>
    ),
  },
  privacy: {
    title: "Privacy notice",
    updated: UPDATED,
    body: (
      <>
        <P>
          This notice explains how Haccora handles personal data under the UK GDPR, the Data
          Protection Act 2018 and, where electronic communications or device storage are involved,
          the Privacy and Electronic Communications Regulations. It covers our public website,
          account administration, support, web app and native apps.
        </P>
        <H>1. Who is responsible for your data</H>
        <P>
          For website visitors, account contacts, billing contacts and direct support requests, the
          controller is <ConfiguredLegalAddress includeEmail />.
        </P>
        <P>
          A subscribing food business is normally the controller for staff records, fitness-to-work
          reports, training records and operational food-safety evidence entered in its workspace.
          Haccora normally processes that data on the customer's documented instructions.
        </P>
        <H>2. Personal data we handle</H>
        <UL>
          <li>Identity and account data, including name, work email, role and site membership.</li>
          <li>Subscription, invoice and transaction references.</li>
          <li>
            Checks, temperatures, cleaning, delivery, allergen, equipment, corrective-action and
            audit evidence.
          </li>
          <li>Induction, training, certificate-expiry and limited fitness-to-work information.</li>
          <li>Documents, photographs and files that authorised users choose to upload.</li>
          <li>
            Optional foreground GPS coordinates, accuracy, device time and server time when an
            authorised user scans an equipment QR label and permits location access.
          </li>
          <li>Device, sign-in, security, diagnostic, notification-token and audit-log data.</li>
        </UL>
        <H>3. Sensitive information</H>
        <P>
          Fitness-to-work information may reveal health data, which is special-category personal
          data. The customer must document a valid UK GDPR Article 6 basis and Article 9 condition,
          restrict access and avoid collecting unnecessary medical detail.
        </P>
        <H>4. Why we use data</H>
        <UL>
          <li>Provide, secure and administer the service and authorised user accounts.</li>
          <li>Process subscriptions, invoices, support, service notices and customer requests.</li>
          <li>Detect misuse, investigate incidents and maintain audit evidence.</li>
          <li>Meet tax, accounting, legal and regulatory duties that apply to Haccora.</li>
          <li>Send marketing only where permitted and always provide an opt-out.</li>
        </UL>
        <P>
          Depending on the activity, our controller bases are contract performance, legitimate
          interests, legal obligation or consent. When acting as processor, the customer determines
          the relevant legal bases.
        </P>
        <H>5. Equipment scans and worker transparency</H>
        <P>
          Haccora does not perform continuous or background location tracking. A location reading is
          requested only during an equipment QR workflow, is optional at device level and is stored
          with the scan accuracy so reviewers can understand its limits. The scan remains
          attributable when location is denied or unavailable.
        </P>
        <P>
          Customers using scan location as worker-monitoring evidence must document why it is
          necessary and proportionate, identify an appropriate lawful basis, give workers clear
          privacy information, set a suitable retention period and complete a data-protection impact
          assessment where required. Employment consent should not be treated as valid merely
          because an app permission was accepted.
        </P>
        <H>6. Recipients and international transfers</H>
        <P>
          Access is limited to authorised customer users and suppliers needed for hosting,
          authentication, storage, payments, email, push notifications, malware scanning, support
          and monitoring. Where data leaves the UK, a lawful transfer mechanism and supplementary
          safeguards are used where required.
        </P>
        <H>7. Retention and security</H>
        <P>
          Data is retained only as long as needed for its purpose, legal claims, security,
          accounting or the customer's documented retention schedule. Haccora uses tenant-scoped
          controls, role and location permissions, private storage, encryption in transit,
          attributable timestamps and audit logging.
        </P>
        <H>8. Your rights</H>
        <UL>
          <li>Access, rectification and, where applicable, erasure.</li>
          <li>Restriction, objection and portability where the legal conditions apply.</li>
          <li>Withdrawal of consent without affecting earlier lawful processing.</li>
          <li>A complaint to the Information Commissioner's Office.</li>
        </UL>
        <P>
          Contact <ConfiguredLegalValue field="email" fallback="the configured privacy email" />. If
          the request concerns your employer's workspace, contact that organisation first. You can
          also read the{" "}
          <A href="https://ico.org.uk/make-a-complaint/data-protection-complaints/">
            ICO complaints guidance
          </A>
          .
        </P>
      </>
    ),
  },
  terms: {
    title: "Business terms of service",
    updated: UPDATED,
    body: (
      <>
        <P>
          These terms apply to Haccora subscriptions purchased by businesses and should be read with
          the accepted order, plan description and data-processing agreement.
        </P>
        <H>1. Business use and accounts</H>
        <P>
          The customer confirms it acts for business purposes and is responsible for accurate
          information, authorised roles, account security and prompt removal of leavers. Accounts
          must not be shared in a way that prevents attribution.
        </P>
        <H>2. Trial, subscription and payment</H>
        <P>
          The seven-day trial does not require card details. A paid subscription starts only at
          checkout or when an order is accepted. Monthly plans renew monthly until cancelled. The
          customer may cancel before renewal through the billing portal. Plan prices are per site,
          per month and VAT is added where applicable.
        </P>
        <H>3. Service and food-safety responsibility</H>
        <P>
          Haccora provides digital workflows, reminders, records, exports and role-based access. It
          supports record keeping and inspection preparation but is not a regulator, certification
          body or substitute for competent food-safety judgment. The food business remains
          responsible for registration, HACCP-based procedures, safe methods, allergens, staff
          competence, corrective action and applicable law.
        </P>
        <H>4. Customer data and acceptable use</H>
        <P>
          The customer retains its rights in customer data and grants Haccora limited permission to
          provide and secure the service. Users must not bypass access controls, probe another
          tenant, introduce malicious code or submit fabricated, backdated or falsely attributed
          evidence.
        </P>
        <H>5. Suspension, export and termination</H>
        <P>
          Access may be suspended where reasonably necessary for security, unlawful use, material
          breach or overdue payment. Customers can export supported evidence while access is active
          and should do so before closure. Return and deletion follow the order and DPA.
        </P>
        <H>6. Warranties and liability</H>
        <P>
          We provide the service with reasonable care and skill but do not guarantee a particular
          inspection result, hygiene rating or legal compliance. Liability limits must be set in the
          accepted order. Nothing excludes liability that cannot lawfully be excluded.
        </P>
        <H>7. Law and disputes</H>
        <P>
          These terms and non-contractual obligations are governed by the law of England and Wales.
          The courts of England and Wales have exclusive jurisdiction unless an enterprise order
          expressly agrees otherwise.
        </P>
      </>
    ),
  },
  cookies: {
    title: "Cookie and device-storage policy",
    updated: UPDATED,
    body: (
      <>
        <P>
          Haccora currently uses only storage necessary to deliver requested website and app
          functions. We do not currently set advertising cookies. Optional analytics or marketing
          tools must remain off until required consent is obtained.
        </P>
        <H>What we use</H>
        <UL>
          <li>Authentication storage for secure sign-in and session refresh.</li>
          <li>Security storage for request integrity and abuse prevention.</li>
          <li>
            User-requested accessibility, compact-layout, navigation and notification settings.
          </li>
          <li>A notice acknowledgement so this message does not appear on every visit.</li>
          <li>Offline app storage for supported records awaiting synchronisation.</li>
        </UL>
        <H>Your controls</H>
        <P>
          Browser and operating-system settings can remove local data or block storage. Blocking
          necessary storage may prevent sign-in, persistence or queued evidence from working.
        </P>
      </>
    ),
  },
  dataProcessing: {
    title: "Data-processing terms summary",
    updated: UPDATED,
    body: (
      <>
        <P>
          This page summarises Haccora's processor commitments and does not replace the executed
          data-processing agreement included with a subscription order.
        </P>
        <H>Roles and instructions</H>
        <P>
          The customer is normally controller for personal data placed in its workspace and Haccora
          is processor. We process it only to provide, secure and support the contracted service on
          documented lawful instructions.
        </P>
        <H>Processor commitments</H>
        <UL>
          <li>Confidentiality and access limited by role, tenant and location.</li>
          <li>Appropriate technical and organisational security measures.</li>
          <li>Controlled subprocessors with equivalent obligations.</li>
          <li>Assistance with rights requests, risk assessments and regulator enquiries.</li>
          <li>Prompt notice and cooperation for confirmed personal-data breaches.</li>
          <li>Return or deletion at the end of services, subject to law and backup rotation.</li>
        </UL>
        <H>Customer responsibilities</H>
        <P>
          The customer must provide lawful instructions, required privacy information, suitable
          retention, user-access controls and an assessment of special-category health processing.
        </P>
      </>
    ),
  },
  accessibility: {
    title: "Accessibility statement",
    updated: UPDATED,
    body: (
      <>
        <P>
          Haccora is designed for fast use in busy food businesses, including with keyboards, screen
          readers, zoom and reduced-motion settings. WCAG 2.2 Level AA is the product benchmark;
          this statement is not a certification of perfect conformance.
        </P>
        <H>Supported access</H>
        <UL>
          <li>Keyboard-operable public and core application navigation.</li>
          <li>Named form controls, visible focus and non-colour-only alerts.</li>
          <li>Responsive layouts, text zoom and optional compact workspace.</li>
          <li>Reduced-motion and higher-contrast preferences where supported.</li>
        </UL>
        <H>Report a problem</H>
        <P>
          Contact <ConfiguredLegalValue field="email" fallback="the configured support email" />
          with the page, device, browser, assistive technology and the task affected.
        </P>
      </>
    ),
  },
  complaints: {
    title: "Complaints procedure",
    updated: UPDATED,
    body: (
      <>
        <P>We take complaints seriously and use them to improve the service.</P>
        <H>How to contact us</H>
        <UL>
          <li>
            Email: <ConfiguredLegalValue field="email" fallback="configure before launch" />
          </li>
          <li>
            Post: <ConfiguredLegalAddress />
          </li>
          <li>
            Phone: <ConfiguredLegalValue field="phone" fallback="configure before launch" />
          </li>
        </UL>
        <H>Response targets</H>
        <P>
          We aim to acknowledge complaints within two business days and provide a substantive
          response within ten business days, or explain why more time is required.
        </P>
        <H>Escalation</H>
        <P>
          Ask for management review if you are dissatisfied. Data-protection complaints may also be
          submitted to the Information Commissioner's Office.
        </P>
      </>
    ),
  },
};

export function legalContent(_lang: Language): Record<LegalKey, LegalDoc> {
  return content;
}
