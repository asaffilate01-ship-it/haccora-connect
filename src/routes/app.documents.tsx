import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  FileArchive,
  FileText,
  ExternalLink,
  Plus,
  Search,
  Folder,
  ShieldCheck,
  Truck,
  Users,
  Sparkles,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/app/documents")({ component: DocumentsPage });

type Category = "haccp" | "training" | "supplier" | "cleaning" | "inspection";
interface Row {
  id: string;
  user_id: string;
  title: string;
  category: string;
  version: string | null;
  file_url: string | null;
  expires_at: string | null;
  issued_on: string | null;
  document_kind: string | null;
  subject_user_id: string | null;
  created_at: string;
  storage_path?: string | null;
  archived_at?: string | null;
}

interface StaffProfile {
  id: string;
  full_name: string | null;
}

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const CAT_ICON: Record<Category, typeof FileText> = {
  haccp: ShieldCheck,
  training: Users,
  supplier: Truck,
  cleaning: Sparkles,
  inspection: FileText,
};

function DocumentsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | Category>("all");
  const [form, setForm] = useState({
    title: "",
    category: "haccp" as Category,
    version: "",
    file_url: "",
    subject_user_id: "",
    document_kind: "",
    issued_on: "",
    expires_at: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [documents, profiles] = await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name").order("full_name"),
    ]);
    setRows((documents.data ?? []) as Row[]);
    setStaff((profiles.data ?? []) as StaffProfile[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !form.title.trim()) return;
    setBusy(true);
    setErr(null);
    let file_url = form.file_url.trim() || null;
    let storage_path: string | null = null;
    let fileSha256: string | null = null;
    if (file_url) {
      try {
        const external = new URL(file_url);
        if (external.protocol !== "https:") throw new Error();
      } catch {
        setBusy(false);
        setErr("External URLs must be valid HTTPS addresses.");
        return;
      }
    }
    if (file) {
      if (!ALLOWED_FILE_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
        setBusy(false);
        setErr("Only PDF, JPG, PNG, WebP or CSV files up to 10 MB.");
        return;
      }
      const ext = file.name.split(".").pop() || "bin";
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      fileSha256 = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const path = `${user.organizationId}/${user.id}/${crypto.randomUUID()}.${ext.toLowerCase()}`;
      const up = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) {
        setBusy(false);
        setErr(up.error.message);
        return;
      }
      storage_path = path;
      file_url = null;
    }
    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      title: form.title.trim(),
      category: form.category,
      version: form.version.trim() || null,
      file_url,
      subject_user_id: form.subject_user_id || null,
      document_kind: form.document_kind || null,
      issued_on: form.issued_on || null,
      expires_at: form.expires_at ? `${form.expires_at}T23:59:59.000Z` : null,
      ...(storage_path
        ? {
            storage_path,
            mime_type: file?.type,
            file_size: file?.size,
            sha256: fileSha256,
          }
        : {}),
    } as any);
    setBusy(false);
    if (error) {
      if (storage_path) await supabase.storage.from("documents").remove([storage_path]);
      setErr(error.message);
      return;
    }
    setForm({
      title: "",
      category: "haccp",
      version: "",
      file_url: "",
      subject_user_id: "",
      document_kind: "",
      issued_on: "",
      expires_at: "",
    });
    setFile(null);
    load();
  };

  const remove = async (r: Row) => {
    if (!confirm("Archive document? The evidence remains retained for audit.")) return;
    await supabase
      .from("documents")
      .update({ archived_at: new Date().toISOString() } as any)
      .eq("id", r.id);
    load();
  };

  const openDocument = async (row: Row) => {
    setErr(null);
    if (row.storage_path) {
      const scan = await (supabase as any).rpc("get_document_scan_status", {
        p_document_id: row.id,
      });
      if (scan.error || scan.data !== "clean") {
        setErr(
          scan.data === "infected"
            ? "The file was blocked. Upload a clean replacement."
            : "The file security scan has not completed yet.",
        );
        return;
      }
      const signed = await supabase.storage
        .from("documents")
        .createSignedUrl(row.storage_path, 5 * 60);
      if (signed.error || !signed.data?.signedUrl) {
        setErr(signed.error?.message ?? "Could not open document.");
        return;
      }
      window.open(signed.data.signedUrl, "_blank", "noopener,noreferrer");
    } else if (row.file_url) {
      window.open(row.file_url, "_blank", "noopener,noreferrer");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (d) => (cat === "all" || d.category === cat) && (!s || d.title.toLowerCase().includes(s)),
    );
  }, [rows, q, cat]);

  const counts: Record<string, number> = { all: rows.length };
  (["haccp", "training", "supplier", "cleaning", "inspection"] as Category[]).forEach(
    (k) => (counts[k] = rows.filter((r) => r.category === k).length),
  );

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="eyebrow">{t("docs.eyebrow")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{t("docs.title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{t("docs.sub")}</p>
        </div>
      </div>

      <div className="surface p-5 grid md:grid-cols-6 gap-3">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder={"Title"}
          className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <select
          value={form.subject_user_id}
          onChange={(e) => setForm({ ...form, subject_user_id: e.target.value })}
          className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          aria-label="Staff member"
        >
          <option value="">Business-wide document</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.full_name || "Unnamed staff member"}
            </option>
          ))}
        </select>
        <select
          value={form.document_kind}
          onChange={(e) => setForm({ ...form, document_kind: e.target.value })}
          className="md:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          aria-label="Document type"
        >
          <option value="">Document type</option>
          <option value="food_hygiene_training">Food hygiene training</option>
          <option value="allergen_training">Allergen awareness</option>
          <option value="haccp_training">HACCP training</option>
          <option value="fitness_to_work">Fitness to work</option>
          <option value="first_aid">First aid</option>
          <option value="supplier_certificate">Supplier certificate</option>
          <option value="pest_report">Pest-control report</option>
          <option value="other">Other</option>
        </select>
        <label className="text-xs text-muted-foreground">
          Issued
          <input
            type="date"
            value={form.issued_on}
            onChange={(e) => setForm({ ...form, issued_on: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Expires
          <input
            type="date"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {(["haccp", "training", "supplier", "cleaning", "inspection"] as Category[]).map((k) => (
            <option key={k} value={k}>
              {t(`docs.cat.${k}`)}
            </option>
          ))}
        </select>
        <input
          value={form.version}
          onChange={(e) => setForm({ ...form, version: e.target.value })}
          placeholder={"Version"}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <label className="rounded-lg border border-dashed border-border bg-card px-3 py-2 text-sm inline-flex items-center gap-2 cursor-pointer hover:bg-secondary/40 truncate">
          <Upload size={14} />
          <span className="truncate">{file ? file.name : "Choose file"}</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          onClick={submit}
          disabled={busy || !form.title.trim()}
          className="btn-alert-solid text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {t("docs.upload")}
        </button>
        <input
          value={form.file_url}
          onChange={(e) => setForm({ ...form, file_url: e.target.value })}
          placeholder={"…or external URL"}
          className="md:col-span-6 rounded-lg border border-border bg-card px-3 py-2 text-xs"
        />
      </div>
      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <div className="grid md:grid-cols-[16rem_1fr] gap-6">
        <aside className="surface p-3 h-fit">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("docs.categories")}
          </div>
          {(["all", "haccp", "training", "supplier", "cleaning", "inspection"] as const).map(
            (k) => (
              <button
                key={k}
                onClick={() => setCat(k)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm mb-0.5 transition ${cat === k ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"}`}
              >
                <span className="flex items-center gap-2">
                  <Folder size={14} /> {t(`docs.cat.${k}`)}
                </span>
                <span className="text-[11px] opacity-70">{counts[k] ?? 0}</span>
              </button>
            ),
          )}
        </aside>

        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("docs.searchPh")}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <div className="surface overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Loader2 size={16} className="inline animate-spin mr-2" />
                {t("docs.loading") || "…"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                <FileArchive size={24} className="mx-auto mb-2 opacity-40" />
                {t("docs.empty")}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((d) => {
                  const Icon = CAT_ICON[d.category as Category] ?? FileText;
                  const subject = staff.find((person) => person.id === d.subject_user_id);
                  const expiryDays = d.expires_at
                    ? Math.ceil((new Date(d.expires_at).getTime() - Date.now()) / 86_400_000)
                    : null;
                  return (
                    <div
                      key={d.id}
                      className="grid grid-cols-1 md:grid-cols-12 px-5 py-4 items-center gap-3"
                    >
                      <div className="md:col-span-6 flex items-center gap-3 min-w-0">
                        <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{d.title}</div>
                          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                            {t(`docs.cat.${d.category}`)}
                          </div>
                          {(subject || d.document_kind) && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {subject?.full_name || "Business-wide"}
                              {d.document_kind ? ` · ${d.document_kind.replaceAll("_", " ")}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2 text-xs font-mono">{d.version ?? "—"}</div>
                      <div className="md:col-span-2 text-xs text-muted-foreground space-y-1">
                        <div>{new Date(d.created_at).toLocaleDateString("en-GB")}</div>
                        {expiryDays !== null && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              expiryDays < 0
                                ? "bg-destructive/10 text-destructive"
                                : expiryDays <= 30
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {expiryDays < 0
                              ? `Expired ${Math.abs(expiryDays)}d ago`
                              : `Expires in ${expiryDays}d`}
                          </span>
                        )}
                      </div>
                      <div className="md:col-span-2 md:text-right flex items-center gap-3 md:justify-end">
                        {d.file_url || d.storage_path ? (
                          <button
                            onClick={() => openDocument(d)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <ExternalLink size={12} /> {t("docs.download")}
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                        {user?.id === d.user_id && (
                          <button
                            onClick={() => remove(d)}
                            className="text-muted-foreground hover:text-destructive"
                            title={"Archive"}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
