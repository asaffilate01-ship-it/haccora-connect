import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { operationalDate } from "@/lib/operational-day";
import { supplierDocumentFlags, type SupplierDocument } from "@/lib/supplier-document-review";

export function SupplierDocumentReview() {
  const copy = enCopy;
  const { user } = useAuth();
  const identity = `${user?.id}:${user?.organizationId}:${user?.locationId}`;
  const active = useRef(identity);
  active.current = identity;
  const generation = useRef(0);
  const [rows, setRows] = useState<SupplierDocument[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState("");
  const [reviewDate, setReviewDate] = useState({ today: "", horizon: "" });
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setError(false);
    setLoaded("");
    try {
      if (!user?.organizationId) throw Error("Workspace required");
      let query = supabase
        .from("documents")
        .select("id,title,expires_at,issued_on,version,storage_path,file_url")
        .eq("organization_id", user.organizationId)
        .eq("category", "supplier")
        .is("archived_at", null);
      if (user.locationId) query = query.eq("location_id", user.locationId);
      const result = await query
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 50, page * 50 + 49);
      if (version !== generation.current || active.current !== identity) return;
      if (result.error || !Array.isArray(result.data)) throw Error("Read failed");
      const now = new Date();
      setReviewDate({
        today: operationalDate(now, "Europe/London"),
        horizon: operationalDate(now, "Europe/London", 30),
      });
      setRows(result.data);
      setLoaded(identity);
    } catch {
      if (version === generation.current && active.current === identity) setError(true);
    } finally {
      if (version === generation.current && active.current === identity) setLoading(false);
    }
  }, [identity, page, user?.organizationId, user?.locationId]);
  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);
  const ready = !loading && !error && loaded === identity;
  return (
    <section className="surface p-5 space-y-4" aria-label={copy.title}>
      <h2 className="text-xl font-bold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.description}</p>
      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="min-h-11 border rounded-lg px-4"
        >
          {copy.refresh}
        </button>
        <button
          type="button"
          disabled={loading || page === 0}
          onClick={() => setPage(page - 1)}
          className="min-h-11 border rounded-lg px-4"
        >
          {copy.previous}
        </button>
        <span>{page + 1}</span>
        <button
          type="button"
          disabled={!ready || rows.length < 50}
          onClick={() => setPage(page + 1)}
          className="min-h-11 border rounded-lg px-4"
        >
          {copy.next}
        </button>
        <Link to="/app/documents" className="min-h-11 inline-flex items-center underline">
          {copy.documents}
        </Link>
      </div>
      {error ? (
        <p role="alert">{copy.error}</p>
      ) : !ready ? (
        <p role="status">{copy.loading}</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {copy.asof} {reviewDate.today} · Europe/London
          </p>
          {rows.length === 0 ? (
            <p>{copy.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const flags = supplierDocumentFlags(row, reviewDate.today, reviewDate.horizon);
                return (
                  <li key={row.id} className="py-4 space-y-2">
                    <h3 className="font-semibold break-words">{row.title}</h3>
                    <p className="text-xs text-muted-foreground break-all">
                      {copy.reference}: {row.id} · {copy.expires}: {row.expires_at || "—"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {flags.length ? (
                        flags.map((flag) => (
                          <span key={flag} className="border rounded px-2 py-1 text-sm">
                            {copy.flags[flag]}
                          </span>
                        ))
                      ) : (
                        <span>{copy.noFlags}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

const enCopy = {
  title: "Supplier document review",
  description:
    "Review recorded metadata before approving evidence. Source contents, malware status and supplier identity are not verified here. Missing expiry dates may need clarification rather than renewal. Open the document register to find the title and inspect its source.",
  refresh: "Refresh review",
  previous: "Previous",
  next: "Next",
  documents: "Open document register",
  error: "Supplier documents could not be loaded. Select a workspace and retry.",
  loading: "Loading supplier documents…",
  asof: "Reviewed against date",
  empty: "No supplier documents on this page.",
  reference: "Reference",
  expires: "Expiry",
  noFlags: "No metadata flags; source review still required.",
  flags: {
    "missing-source": "No usable source recorded",
    "missing-expiry": "Expiry not recorded",
    "invalid-date": "Invalid date",
    expired: "Recorded expiry has passed",
    expiring: "Expires today or within 30 days",
    "future-issued": "Issue date is in the future",
    "date-order": "Issue date is after expiry",
    "missing-version": "Version not recorded",
  },
};
