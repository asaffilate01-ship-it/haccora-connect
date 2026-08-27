import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { listFsaAuthorities, runFsaProspectSync } from "@/lib/fsa-prospects.functions";

export const Route = createFileRoute("/platform-prospects")({
  head: () => ({
    meta: [
      { title: "FSA prospect pipeline — Haccora platform" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProspectPipeline,
});

const RESTAURANT_TYPE_ID = 1; // FHRS "Restaurant/Cafe/Canteen"
const TAKEAWAY_TYPE_ID = 7844; // FHRS "Takeaway/sandwich shop"

const OUTREACH_STATUSES = [
  "new",
  "queued",
  "contacted",
  "replied",
  "qualified",
  "won",
  "lost",
  "suppressed",
] as const;

type Prospect = {
  id: string;
  fhrs_id: string;
  business_name: string;
  business_type: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postcode: string | null;
  local_authority: string | null;
  rating_value: string | null;
  rating_date: string | null;
  awaiting_inspection: boolean;
  outreach_status: string;
  legal_entity_type: string;
  email_marketing_permitted: boolean;
  tps_checked_at: string | null;
  phone: string | null;
  contact_email: string | null;
  notes: string | null;
};

function addressOf(prospect: Prospect) {
  return [prospect.address_line_1, prospect.address_line_2, prospect.postcode]
    .filter(Boolean)
    .join(", ");
}

function ProspectPipeline() {
  const { user, hydrated } = useAuth();
  const platformRole = user?.platformRole ?? null;
  const loading = !hydrated;
  const navigate = useNavigate();
  const loadAuthorities = useServerFn(listFsaAuthorities);
  const runSync = useServerFn(runFsaProspectSync);

  const [authorities, setAuthorities] = useState<Array<{ id: number; name: string }>>([]);
  const [authorityId, setAuthorityId] = useState<string>("");
  const [businessType, setBusinessType] = useState<string>(String(RESTAURANT_TYPE_ID));
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = platformRole === "platform_owner" || platformRole === "platform_support";

  useEffect(() => {
    if (loading) return;
    if (!platformRole) void navigate({ to: "/login" });
    else if (!canEdit) void navigate({ to: "/platform" });
  }, [canEdit, loading, platformRole, navigate]);

  const refresh = useCallback(async () => {
    const { data, error: readError } = await supabase
      .from("fsa_prospects")
      .select(
        "id,fhrs_id,business_name,business_type,address_line_1,address_line_2,postcode,local_authority,rating_value,rating_date,awaiting_inspection,outreach_status,legal_entity_type,email_marketing_permitted,tps_checked_at,phone,contact_email,notes",
      )
      .order("awaiting_inspection", { ascending: false })
      .order("business_name", { ascending: true })
      .limit(500);
    if (readError) setError(readError.message);
    else setProspects((data ?? []) as Prospect[]);
  }, []);

  useEffect(() => {
    if (!platformRole) return;
    void refresh();
    loadAuthorities({})
      .then((rows) => setAuthorities(rows))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Could not load local authorities"),
      );
  }, [platformRole, refresh, loadAuthorities]);

  const visible = useMemo(
    () =>
      statusFilter === "all"
        ? prospects
        : prospects.filter((prospect) => prospect.outreach_status === statusFilter),
    [prospects, statusFilter],
  );

  const awaiting = prospects.filter((prospect) => prospect.awaiting_inspection).length;
  const lowRated = prospects.length - awaiting;

  const onSync = async () => {
    if (!authorityId) {
      setError("Choose a local authority first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await runSync({
        data: {
          localAuthorityId: Number(authorityId),
          businessTypeId: businessType ? Number(businessType) : null,
          maxRecords: 500,
        },
      });
      setMessage(
        `Imported ${result.upserted} prospects (${result.matched} matched of ${result.fetched} fetched) from ${result.localAuthority ?? "the selected authority"}.`,
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const updateProspect = async (id: string, patch: Partial<Prospect>) => {
    setProspects((current) =>
      current.map((prospect) => (prospect.id === id ? { ...prospect, ...patch } : prospect)),
    );
    const { error: writeError } = await supabase.from("fsa_prospects").update(patch).eq("id", id);
    if (writeError) {
      setError(writeError.message);
      await refresh();
    }
  };

  const exportCsv = () => {
    const header = [
      "FHRS ID",
      "Business",
      "Type",
      "Address",
      "Local authority",
      "Rating",
      "Awaiting inspection",
      "Status",
      "Entity type",
      "Email permitted",
    ];
    const rows = visible.map((prospect) => [
      prospect.fhrs_id,
      prospect.business_name,
      prospect.business_type ?? "",
      addressOf(prospect),
      prospect.local_authority ?? "",
      prospect.rating_value ?? "",
      prospect.awaiting_inspection ? "yes" : "no",
      prospect.outreach_status,
      prospect.legal_entity_type,
      prospect.email_marketing_permitted ? "yes" : "no",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "haccora-fsa-prospects.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !platformRole || !canEdit) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-10 w-auto" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Platform operations
              </p>
              <h1 className="text-2xl font-bold text-foreground">FSA prospect pipeline</h1>
            </div>
          </div>
          <Link
            to="/platform"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Control plane
          </Link>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Data comes from the Food Standards Agency Food Hygiene Rating Scheme under the Open
              Government Licence. It contains business identity, address and rating only — never a
              contact name, phone number or email. Enrich Ltd/LLP records only, screen every call
              against TPS/CTPS, record a legitimate-interest assessment, and keep an opt-out in
              every message. Sole traders and partnerships must not be emailed without consent.
            </p>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-[2fr_1fr_auto_auto]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground">Local authority</span>
            <select
              value={authorityId}
              onChange={(event) => setAuthorityId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="">Select an authority…</option>
              {authorities.map((authority) => (
                <option key={authority.id} value={authority.id}>
                  {authority.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-foreground">Business type</span>
            <select
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value={RESTAURANT_TYPE_ID}>Restaurants, cafés and canteens</option>
              <option value={TAKEAWAY_TYPE_ID}>Takeaways and sandwich shops</option>
              <option value="">All food businesses</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onSync}
            disabled={busy || !canEdit}
            className="self-end rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Importing
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Import from FSA
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="self-end rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </span>
          </button>
        </section>

        {message ? (
          <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="inline-flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total prospects", value: prospects.length },
            { label: "Awaiting inspection", value: awaiting },
            { label: "Rated 0–2", value: lowRated },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Filter</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {OUTREACH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Authority</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Email OK</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No prospects yet. Choose a local authority and import from the FSA.
                  </td>
                </tr>
              ) : (
                visible.map((prospect) => (
                  <tr key={prospect.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{prospect.business_name}</p>
                      <p className="text-xs text-muted-foreground">{addressOf(prospect)}</p>
                      <p className="text-xs text-muted-foreground">{prospect.business_type}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{prospect.local_authority}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          prospect.awaiting_inspection
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {prospect.awaiting_inspection
                          ? "Awaiting inspection"
                          : `Rated ${prospect.rating_value ?? "—"}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={prospect.legal_entity_type}
                        disabled={!canEdit}
                        onChange={(event) =>
                          void updateProspect(prospect.id, {
                            legal_entity_type: event.target.value,
                          })
                        }
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      >
                        {[
                          "unknown",
                          "limited_company",
                          "llp",
                          "sole_trader",
                          "partnership",
                          "public_body",
                        ].map((entity) => (
                          <option key={entity} value={entity}>
                            {entity.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          disabled={
                            !canEdit ||
                            !["limited_company", "llp", "public_body"].includes(
                              prospect.legal_entity_type,
                            )
                          }
                          checked={prospect.email_marketing_permitted}
                          onChange={(event) =>
                            void updateProspect(prospect.id, {
                              email_marketing_permitted: event.target.checked,
                            })
                          }
                        />
                        PECR B2B
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={prospect.outreach_status}
                        disabled={!canEdit}
                        onChange={(event) =>
                          void updateProspect(prospect.id, { outreach_status: event.target.value })
                        }
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                      >
                        {OUTREACH_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
