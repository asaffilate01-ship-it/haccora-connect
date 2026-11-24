import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { operationalDate } from "@/lib/operational-day";
import { UK_COMPLIANCE_VERSION, UK_PRODUCT_DISCLAIMER } from "@/lib/uk-compliance";
import { UK_AUTHORITY_PROFILES, isUkJurisdiction, type UkJurisdiction } from "@/lib/uk-authorities";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/app/uk-compliance")({ component: UkCompliance });
const NATIONS = [
  ["england", "England"],
  ["wales", "Wales"],
  ["scotland", "Scotland"],
  ["northern_ireland", "Northern Ireland"],
] as const;

function UkCompliance() {
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId) {
    return (
      <p className="p-5 text-sm">Select a business location to review its compliance profile.</p>
    );
  }
  return (
    <ComplianceProfile
      key={`${user.id}:${user.organizationId}:${user.locationId}`}
      organizationId={user.organizationId}
      locationId={user.locationId}
      userId={user.id}
    />
  );
}

function ComplianceProfile({
  organizationId,
  locationId,
  userId,
}: {
  organizationId: string;
  locationId: string;
  userId: string;
}) {
  const [jurisdiction, setJurisdiction] = useState<UkJurisdiction>("england");
  const [businessType, setBusinessType] = useState("caterer");
  const [localAuthority, setLocalAuthority] = useState("");
  const [registrationReference, setRegistrationReference] = useState("");
  const [registrationConfirmed, setRegistrationConfirmed] = useState(false);
  const [confirmationDate, setConfirmationDate] = useState<string | null>(null);
  const [ppds, setPpds] = useState(false);
  const [vulnerable, setVulnerable] = useState(false);
  const [message, setMessage] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("site_compliance_profiles")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (data) {
          if (isUkJurisdiction(data.jurisdiction)) setJurisdiction(data.jurisdiction);
          setBusinessType(data.business_type);
          setLocalAuthority(data.local_authority_name ?? "");
          setRegistrationReference(data.registration_reference ?? "");
          setRegistrationConfirmed(Boolean(data.registration_confirmed_at));
          setConfirmationDate(data.registration_confirmed_at ?? null);
          setPpds(data.serves_ppds);
          setVulnerable(data.serves_vulnerable_groups);
        }
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, locationId, reload]);

  const save = async () => {
    if (loadState !== "ready" || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setMessage("");
    const date = registrationConfirmed
      ? (confirmationDate ?? operationalDate(new Date(), "Europe/London"))
      : null;
    try {
      const { data, error } = await supabase
        .from("site_compliance_profiles")
        .upsert(
          {
            organization_id: organizationId,
            location_id: locationId,
            jurisdiction,
            business_type: businessType,
            local_authority_name: localAuthority.trim() || null,
            registration_reference: registrationReference.trim() || null,
            registration_confirmed_at: date,
            serves_ppds: ppds,
            serves_vulnerable_groups: vulnerable,
            approved_content_version: UK_COMPLIANCE_VERSION,
            reviewed_at: new Date().toISOString(),
            reviewed_by: userId,
          },
          { onConflict: "organization_id,location_id" },
        )
        .select("registration_confirmed_at")
        .single();
      if (error || !data) throw new Error("Profile not saved");
      setConfirmationDate(data.registration_confirmed_at ?? null);
      setMessage("UK compliance profile reviewed and saved.");
    } catch {
      setMessage("The compliance profile was not saved. Please check access and try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  const authority = UK_AUTHORITY_PROFILES[jurisdiction];
  return (
    <div className="p-5 md:p-8 max-w-5xl space-y-5">
      <div>
        <div className="eyebrow">UK MARKET CONFIGURATION</div>
        <h1 className="mt-1">Compliance profile</h1>
        <p className="text-muted-foreground mt-2">
          Configure the correct nation and operating risks before adopting safe methods. England,
          Wales, Scotland and Northern Ireland guidance is versioned separately.
        </p>
      </div>
      {loadState === "loading" && <p role="status">Loading compliance profile…</p>}
      {loadState === "error" && (
        <div role="alert" className="surface p-4 text-sm">
          The existing profile could not be loaded. Editing is disabled to protect your records.
          <button
            type="button"
            className="btn-secondary mt-3 block px-3 py-2"
            onClick={() => {
              setLoadState("loading");
              setReload((value) => value + 1);
            }}
          >
            Retry loading
          </button>
        </div>
      )}
      <fieldset
        disabled={loadState !== "ready" || saving}
        className="surface p-5 grid md:grid-cols-2 gap-5 min-w-0"
      >
        <legend className="sr-only">Location compliance details</legend>
        <label className="text-sm font-bold">
          UK nation
          <select
            className="input block w-full mt-2"
            value={jurisdiction}
            onChange={(e) => {
              if (isUkJurisdiction(e.target.value)) {
                setJurisdiction(e.target.value);
                setRegistrationConfirmed(false);
                setConfirmationDate(null);
              }
            }}
          >
            {NATIONS.map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Responsible local authority or council
          <input
            className="input block w-full mt-2"
            value={localAuthority}
            onChange={(event) => {
              setLocalAuthority(event.target.value);
              setRegistrationConfirmed(false);
              setConfirmationDate(null);
            }}
            placeholder={authority.authorityLabel}
            maxLength={160}
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Enter the authority where this premises is registered—not a London district or county
            category.
          </span>
        </label>
        <label className="text-sm font-bold">
          Registration or evidence reference (optional)
          <input
            className="input block w-full mt-2"
            value={registrationReference}
            onChange={(event) => {
              setRegistrationReference(event.target.value);
              setRegistrationConfirmed(false);
              setConfirmationDate(null);
            }}
            placeholder="Your internal reference or document number"
            maxLength={160}
          />
        </label>
        <label className="text-sm font-bold">
          Business type
          <select
            className="input block w-full mt-2"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            <option value="caterer">Restaurant / caterer</option>
            <option value="retailer">Retailer</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="mobile_caterer">Mobile caterer</option>
            <option value="institutional">School, care or healthcare catering</option>
          </select>
        </label>
        <label className="flex gap-3 items-start md:col-span-2">
          <input
            type="checkbox"
            checked={registrationConfirmed}
            onChange={(event) => {
              setRegistrationConfirmed(event.target.checked);
              setConfirmationDate(null);
            }}
          />
          <span>
            <strong className="block">Food-business registration evidence checked</strong>
            <span className="text-sm text-muted-foreground">
              Preserves the original confirmation date unless you reconfirm the evidence. This is
              your internal record and is not authority verification.
            </span>
          </span>
        </label>
        <label className="flex gap-3 items-start">
          <input type="checkbox" checked={ppds} onChange={(e) => setPpds(e.target.checked)} />
          <span>
            <strong className="block">We sell PPDS food</strong>
            <span className="text-sm text-muted-foreground">
              Food packaged on the same premises before the customer selects it.
            </span>
          </span>
        </label>
        <label className="flex gap-3 items-start">
          <input
            type="checkbox"
            checked={vulnerable}
            onChange={(e) => setVulnerable(e.target.checked)}
          />
          <span>
            <strong className="block">We serve vulnerable groups</strong>
            <span className="text-sm text-muted-foreground">
              For example young children, older people or clinically vulnerable customers.
            </span>
          </span>
        </label>
        <div className="md:col-span-2">
          <button className="btn-primary px-5 py-2" onClick={() => void save()}>
            {saving ? "Saving…" : "Review and save"}
          </button>
          {message && (
            <p role="status" className="text-sm mt-3">
              {message}
            </p>
          )}
        </div>
      </fieldset>
      <section className="surface p-5" aria-labelledby="authority-context-title">
        <div className="eyebrow">AUTHORITY CONTEXT</div>
        <h2 id="authority-context-title" className="mt-2 text-xl">
          {authority.label}: {authority.regulator}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Rating and publication context: {authority.ratingScheme}. Your named local authority is
          responsible for registration and routine enforcement at this premises.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            [authority.registrationUrl, "Official registration guidance"],
            [authority.guidanceUrl, "Official business guidance"],
            [authority.ratingUrl, authority.ratingScheme],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-3 py-2 text-xs"
            >
              {label} <ExternalLink size={13} />
            </a>
          ))}
        </div>
      </section>
      <div className="surface p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Important:</strong> {UK_PRODUCT_DISCLAIMER}
      </div>
    </div>
  );
}
