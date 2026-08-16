import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/legal")({
  component: LegalLayout,
});

function LegalLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const items: Array<{ to: string; k: string }> = [
    { to: "/legal/company-details", k: "footer.company" },
    { to: "/legal/privacy", k: "footer.privacy" },
    { to: "/legal/terms", k: "footer.terms" },
    { to: "/legal/cookies", k: "footer.cookies" },
    { to: "/legal/data-processing", k: "footer.dataProcessing" },
    { to: "/legal/accessibility", k: "footer.accessibility" },
    { to: "/legal/complaints", k: "footer.complaints" },
  ];
  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 flex items-center justify-between">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold"
          >
            <ArrowLeft size={16} /> {t("legal.back")}
          </Link>
          <BrandLogo imgClassName="h-8 w-auto" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/65">
            UK legal
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-8 h-max">
          <div className="text-xs font-black uppercase tracking-widest text-black/60">
            {t("legal.title")}
          </div>
          <nav className="mt-4 flex lg:flex-col gap-1 flex-wrap">
            {items.map((i) => {
              const active = pathname === i.to;
              return (
                <Link
                  key={i.to}
                  to={i.to}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                    active
                      ? "bg-black text-white"
                      : "text-black/70 hover:bg-black/5 hover:text-black"
                  }`}
                >
                  {t(i.k)}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="max-w-[760px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
