import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { FollowBar } from "@/components/SocialIcons";
import { PUBLIC_CONFIG, TRADING_STATEMENT } from "@/lib/public-config";

interface MarketingShellProps {
  children: ReactNode;
}

/**
 * Lightweight header/footer wrapper for standalone marketing pages
 * (free tools, comparisons, sector landing pages).
 */
export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      <header className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 min-h-16 md:h-20 flex flex-wrap items-center justify-between gap-3 py-3 md:py-0">
          <BrandLogo light imgClassName="h-10 md:h-12 w-auto" />
          <nav
            aria-label="Primary"
            className="order-3 w-full md:order-none md:w-auto flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar text-[0.72rem] md:text-xs font-black uppercase tracking-widest text-white/70"
          >
            <Link to="/features" className="shrink-0 hover:text-white">
              Features
            </Link>
            <Link to="/pricing" className="shrink-0 hover:text-white">
              Pricing
            </Link>
            <Link to="/help" className="shrink-0 hover:text-white">
              Help
            </Link>
            <Link to="/blog" className="shrink-0 hover:text-white">
              Blog
            </Link>
            <Link to="/contact" className="shrink-0 hover:text-white">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <FollowBar dark />
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center rounded-full bg-[color:var(--color-alert-red)] px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="bg-black text-white/70">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm">
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} {PUBLIC_CONFIG.legal.companyName}. Food safety software for
            UK food businesses.
            <br />
            {TRADING_STATEMENT}
          </p>
          <nav className="flex flex-wrap gap-4 text-xs uppercase tracking-widest font-black">
            <Link to="/home" className="hover:text-white">
              Home
            </Link>
            <Link to="/blog" className="hover:text-white">
              Blog
            </Link>
            <Link to="/free-tools/haccp-plan-template" className="hover:text-white">
              Free HACCP template
            </Link>
            <Link to="/legal/privacy" className="hover:text-white">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
