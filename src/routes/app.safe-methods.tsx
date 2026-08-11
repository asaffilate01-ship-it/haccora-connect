import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
const db = supabase as any;

export const Route = createFileRoute("/app/safe-methods")({ component: SafeMethods });
type Method = {
  id: string;
  title: string;
  category: string;
  summary: string;
  prompts: string[];
  official_source_url: string;
};
type Adoption = { template_id: string; status: string; review_due_at: string | null };
function SafeMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<Method[]>([]);
  const [adopted, setAdopted] = useState<Adoption[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      db.from("safe_method_templates").select("*").order("title"),
      db.from("site_safe_methods").select("template_id,status,review_due_at"),
    ]);
    setMethods((a.data ?? []) as Method[]);
    setAdopted((b.data ?? []) as Adoption[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const activate = async (id: string) => {
    if (!user?.organizationId || !user.locationId) return;
    const review = new Date();
    review.setFullYear(review.getFullYear() + 1);
    const { error } = await db.from("site_safe_methods").upsert(
      {
        organization_id: user.organizationId,
        location_id: user.locationId,
        template_id: id,
        status: "active",
        adopted_by: user.id,
        adopted_at: new Date().toISOString(),
        review_due_at: review.toISOString().slice(0, 10),
      },
      { onConflict: "organization_id,location_id,template_id" },
    );
    setMessage(error?.message ?? "Safe method activated and review scheduled.");
    if (!error) void load();
  };
  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <div className="eyebrow">UK FOOD SAFETY MANAGEMENT</div>
        <h1 className="text-4xl mt-1">Safe methods</h1>
        <p className="text-muted-foreground max-w-3xl mt-2">
          Adapt these guided controls to how your business actually operates. They support your food
          safety management system; official FSA/FSS guidance and your local authority remain
          authoritative.
        </p>
      </div>
      {message && <div className="surface p-3 text-sm">{message}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {methods.map((m) => {
          const a = adopted.find((x) => x.template_id === m.id);
          return (
            <article className="surface p-5" key={m.id}>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {m.category.replaceAll("_", " ")}
              </div>
              <h2 className="text-xl font-bold mt-1">{m.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{m.summary}</p>
              <ul className="list-disc pl-5 text-sm mt-3 space-y-1">
                {m.prompts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-3 items-center">
                <button className="btn-primary px-4 py-2" onClick={() => void activate(m.id)}>
                  {a?.status === "active" ? "Reconfirm" : "Adopt method"}
                </button>
                <a
                  className="text-sm underline"
                  href={m.official_source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Official guidance
                </a>
              </div>
              {a?.review_due_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Review due {new Date(a.review_due_at).toLocaleDateString("en-GB")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
