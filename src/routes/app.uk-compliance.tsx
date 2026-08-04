import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UK_COMPLIANCE_VERSION, UK_PRODUCT_DISCLAIMER } from "@/lib/uk-compliance";

export const Route = createFileRoute("/app/uk-compliance")({ component: UkCompliance });
const NATIONS = [
  ["england", "England"],
  ["wales", "Wales"],
  ["scotland", "Scotland"],
  ["northern_ireland", "Northern Ireland"],
] as const;

function UkCompliance() {
  const { user } = useAuth();
  const [jurisdiction, setJurisdiction] = useState("england");
  const [businessType, setBusinessType] = useState("caterer");
  const [ppds, setPpds] = useState(false);
  const [vulnerable, setVulnerable] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!user?.organizationId || !user.locationId) return;
    void supabase
      .from("site_compliance_profiles")
      .select("*")
      .eq("organization_id", user.organizationId)
      .eq("location_id", user.locationId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setJurisdiction(data.jurisdiction);
          setBusinessType(data.business_type);
          setPpds(data.serves_ppds);
          setVulnerable(data.serves_vulnerable_groups);
        }
      });
  }, [user]);
  const save = async () => {
    if (!user?.organizationId || !user.locationId) return;
    const { error } = await supabase.from("site_compliance_profiles").upsert(
      {
        organization_id: user.organizationId,
        location_id: user.locationId,
        jurisdiction,
        business_type: businessType,
        serves_ppds: ppds,
        serves_vulnerable_groups: vulnerable,
        approved_content_version: UK_COMPLIANCE_VERSION,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      },
      { onConflict: "organization_id,location_id" },
    );
    setMessage(error?.message ?? "UK compliance profile reviewed and saved.");
  };
  return (
    <div className="p-6 md:p-10 max-w-4xl space-y-6">
      <div>
        <div className="eyebrow">UK MARKET CONFIGURATION</div>
        <h1 className="text-4xl mt-1">Compliance profile</h1>
        <p className="text-muted-foreground mt-2">
          Configure the correct nation and operating risks before adopting safe methods. England,
          Wales, Scotland and Northern Ireland guidance is versioned separately.
        </p>
      </div>
      <div className="surface p-6 grid md:grid-cols-2 gap-5">
        <label className="text-sm font-bold">
          UK nation
          <select
            className="input block w-full mt-2"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            {NATIONS.map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
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
            Review and save
          </button>
          {message && <p className="text-sm mt-3">{message}</p>}
        </div>
      </div>
      <div className="surface p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Important:</strong> {UK_PRODUCT_DISCLAIMER}
      </div>
    </div>
  );
}
