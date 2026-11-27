import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Layers3, Loader2, Search, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VeyumoMobile } from "@/components/veyumo/VeyumoMobile";
import {
  BUSINESS_SERVICES,
  SERVICE_CATEGORIES,
  SERVICE_REQUEST_STATUS,
  filterBusinessServices,
  type BusinessService,
} from "@/lib/business-services";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/add-ons")({
  validateSearch: (search: Record<string, unknown>): { service?: string } => ({
    service:
      typeof search.service === "string" &&
      BUSINESS_SERVICES.some((item) => item.id === search.service)
        ? search.service
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Business services & add-ons — Haccora" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BusinessServicesPage,
});

type ServiceRequest = {
  id: string;
  case_number: number;
  business_service: string;
  status: string;
  created_at: string;
};

function BusinessServicesPage() {
  const { user } = useAuth();
  const { service } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All services");
  const [selected, setSelected] = useState<BusinessService | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [bundle, setBundle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const requestInFlight = useRef(false);
  const activeWorkspace = useRef(user?.organizationId);
  activeWorkspace.current = user?.organizationId;
  const canManage = user?.role === "owner" && !!user.organizationId;

  const openService = useCallback((item: BusinessService) => {
    setSelected(item);
    setMessage("");
    setConsent(false);
    setBundle(false);
    setSubmitError("");
  }, []);

  useEffect(() => {
    setRequests([]);
    setSelected(null);
    setMobileOpen(false);
    setNotice("");
  }, [user?.organizationId]);

  useEffect(() => {
    const item = BUSINESS_SERVICES.find((entry) => entry.id === service);
    if (item && canManage) openService(item);
  }, [service, canManage, openService]);

  const loadRequests = useCallback(async () => {
    const requestedWorkspace = user?.organizationId;
    if (!canManage || !requestedWorkspace) return;
    setLoading(true);
    setReadError("");
    try {
      const { data, error } = await (supabase as any).rpc("get_my_business_service_requests");
      if (activeWorkspace.current !== requestedWorkspace) return;
      if (error) throw error;
      setRequests(data ?? []);
    } catch {
      if (activeWorkspace.current === requestedWorkspace)
        setReadError("We could not load your requests. Please retry or use the Support centre.");
    } finally {
      if (activeWorkspace.current === requestedWorkspace) setLoading(false);
    }
  }, [canManage, user?.organizationId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => filterBusinessServices(query, category), [category, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !selected || !consent || requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setSubmitError("");
    setNotice("");
    try {
      const { error } = await (supabase as any).rpc("request_business_service", {
        p_service: selected.id,
        p_message: message.trim(),
        p_contact_consent: consent,
        p_bundle_quote: bundle,
      });
      if (error) throw error;
      setSelected(null);
      setNotice(
        "Your request is saved with Haccora. Follow replies in the Support centre. No service has been purchased or connected.",
      );
      await loadRequests();
    } catch {
      setSubmitError(
        "Your request could not be confirmed. Retry to check for an existing request, or contact the Support centre.",
      );
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  if (!canManage) return null;
  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 md:p-8 lg:p-10">
      <header className="rounded-2xl bg-primary p-6 text-primary-foreground md:p-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <Layers3 size={18} aria-hidden="true" /> Haccora business network
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl">More for your business</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">
          Explore AI, reporting, financial tools, people, supplies and technology for your food
          business. Choose a service or ask for a quote across several.
        </p>
        <p className="mt-4 text-xs">
          Your Haccora plan continues separately. Each additional service needs its own agreed
          terms.
        </p>
      </header>

      {notice && (
        <p role="status" className="rounded-xl border border-border bg-secondary p-4 text-sm">
          {notice}
        </p>
      )}
      <section aria-label="Find business services" className="space-y-4">
        <label className="relative block max-w-lg">
          <span className="sr-only">Search business services</span>
          <Search
            className="absolute left-3 top-3.5 text-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AI, GraphRAG, financials, recruitment…"
            className="min-h-12 w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Service categories">
          {SERVICE_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length} services
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="surface flex flex-col p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {item.category}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  {item.availability}
                </span>
              </div>
              <p className="mt-5 text-sm font-bold text-primary">{item.name}</p>
              <h2 className="mt-1 text-xl">{item.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <button
                type="button"
                onClick={() => openService(item)}
                className="mt-5 flex min-h-11 items-center justify-between rounded-xl border border-border px-4 text-left text-sm font-semibold"
              >
                Explore {item.name}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <p className="surface p-6 text-sm">
            No matching services. Try another search or category.
          </p>
        )}
      </section>

      <section aria-labelledby="service-requests-title" className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="service-requests-title" className="text-2xl">
            Your service requests
          </h2>
          <Link to="/app/support" className="min-h-11 py-3 text-sm font-semibold underline">
            Open Support centre
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Track enquiries and quotes here. A resolved request does not mean a service is activated.
        </p>
        {loading ? (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading requests…
          </p>
        ) : readError ? (
          <div role="alert" className="mt-4 text-sm">
            <p>{readError}</p>
            <button
              type="button"
              onClick={() => void loadRequests()}
              className="mt-2 min-h-11 underline"
            >
              Retry requests
            </button>
          </div>
        ) : requests.length ? (
          <ul className="mt-4 divide-y divide-border">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {BUSINESS_SERVICES.find((item) => item.id === request.business_service)?.name ??
                      "Business service"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Request #{request.case_number} ·{" "}
                    {new Date(request.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {SERVICE_REQUEST_STATUS[request.status] ?? "Under review"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            No requests yet. Explore a service to tell us what your business needs.
          </p>
        )}
      </section>

      <section className="surface p-5 md:p-6" aria-label="Veyumo account connection">
        <h2 className="text-2xl">Already using Veyumo?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the connection panel to link your mobile account. This shares your verified owner
          identity and business identifier with Veyumo. Plan purchases require a separate checkout.
        </p>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
        >
          {mobileOpen ? "Close mobile connection" : "Open mobile connection"}
        </button>
        {mobileOpen && <VeyumoMobile />}
      </section>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck size={18} className="shrink-0" aria-hidden="true" />
        Exploring a provider website does not transfer your Haccora records. Connections and data
        permissions must be agreed separately. These are services within our business network;
        compare the provider’s offer before buying.
      </p>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.name} — {selected.title}
                </DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <ul className="space-y-2 text-sm">
                {selected.benefits.map((benefit) => (
                  <li className="flex items-start gap-2" key={benefit}>
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
              {selected.dataNeeded && (
                <div className="rounded-xl border border-border p-3 text-sm">
                  <h3 className="font-semibold">Data to agree before connection</h3>
                  <p className="mt-1 text-muted-foreground">{selected.dataNeeded.join(" · ")}</p>
                </div>
              )}
              {selected.reviewNote && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {selected.reviewNote}
                </p>
              )}
              {selected.href && (
                <a
                  href={selected.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline"
                >
                  {selected.availability === "Pilot"
                    ? "Open pilot workspace"
                    : `Visit ${selected.name}`}{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {selected.availability === "Pilot" && (
                <p className="rounded-xl bg-secondary p-3 text-xs">
                  The intelligence workspace is a pilot. Your Haccora data and EPOS are not
                  connected by opening it.
                </p>
              )}
              <form
                onSubmit={(event) => void submit(event)}
                className="space-y-4 border-t border-border pt-4"
              >
                <h3 className="font-semibold">Request help or a quote</h3>
                <label className="block text-sm font-medium">
                  What does your business need?
                  <textarea
                    required
                    minLength={10}
                    maxLength={3000}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    placeholder="For example: payroll for eight staff, or rice deliveries to Luton…"
                    className="mt-2 block w-full rounded-xl border border-border bg-background p-3 font-normal"
                  />
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bundle}
                    onChange={(event) => setBundle(event.target.checked)}
                    className="mt-1"
                  />
                  <span>Include any available multi-service offers in my quote.</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    required
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I agree that Haccora can review this request and contact me about this service.
                    An introduction or data connection needs my separate agreement.
                  </span>
                </label>
                <p className="text-xs text-muted-foreground">
                  This saves a request in your organisation’s Support centre. It does not subscribe
                  you, charge you or send records to another provider.
                </p>
                {submitError && (
                  <p role="alert" className="text-sm text-destructive">
                    {submitError}
                  </p>
                )}
                <button
                  disabled={busy || !consent || message.trim().length < 10}
                  className="btn-alert-solid min-h-11 w-full text-sm disabled:opacity-50"
                >
                  {busy ? "Saving request…" : "Save service request"}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
