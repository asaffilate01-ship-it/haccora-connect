import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BUSINESS_SERVICES } from "@/lib/business-services";

export function BusinessServicePrompt({
  services,
  title = "More for your business",
}: {
  services: string[];
  title?: string;
}) {
  const { user } = useAuth();
  if (user?.role !== "owner" || !user.organizationId) return null;
  const offers = services.flatMap((id) => BUSINESS_SERVICES.filter((service) => service.id === id));
  return (
    <aside
      aria-label={title}
      className="rounded-2xl border border-border bg-secondary/40 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Plus size={17} aria-hidden="true" />
          {title}
        </h2>
        <Link
          to="/app/add-ons"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline underline-offset-4"
        >
          All business services <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {offers.map((service) => (
          <Link
            key={service.id}
            to="/app/add-ons"
            search={{ service: service.id }}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="text-xs font-semibold text-muted-foreground">{service.name}</span>
            <span className="mt-1 block font-semibold">{service.title}</span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {service.availability === "Request setup"
                ? "Explore & request a quote"
                : service.availability === "Pilot"
                  ? "Explore the pilot"
                  : "Explore provider"}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Optional services. Availability, prices and any bundle savings are confirmed before you
        commit.
      </p>
    </aside>
  );
}
