import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Enter site password — Haccora" },
      {
        name: "description",
        content: "Live site preview of Haccora. Enter the password to view the full site.",
      },
      { property: "og:title", content: "Enter site password — Haccora" },
      {
        property: "og:description",
        content: "Live site preview of Haccora food safety software for UK food businesses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read from the form, not state: on mobile a value typed before hydration
    // never reaches React state and the submit would send an empty password.
    const typed = String(new FormData(event.currentTarget).get("password") ?? "") || password;
    if (!typed) return;
    setBusy(true);
    setError(false);
    try {
      const result = await unlock({ data: { password: typed } });
      if (result.ok) {
        await router.navigate({ to: "/home" });
        router.invalidate();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="marketing-shell min-h-screen bg-black text-white flex flex-col">
      <header className="mx-auto w-full max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <BrandLogo light imgClassName="h-9 md:h-12 w-auto" />
        <Link to="/" className="text-xs font-black uppercase tracking-widest text-white/60">
          Back
        </Link>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center px-4 py-14"
      >
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
          <span className="icon-3d-dark inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <Lock size={20} />
          </span>
          <h1 className="mt-5 text-3xl font-black uppercase tracking-tight">Live site</h1>
          <p className="mt-2 text-sm text-white/60">
            Enter the password to unlock the full Haccora site and product workspace.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label htmlFor="site-password" className="sr-only">
              Promo password
            </label>
            <div className="relative">
              <input
                id="site-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Promo password"
                className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 pr-12 text-base text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-alert-red)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-alert-red)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-[color:var(--color-alert-red)]">
                Incorrect password. Please try again.
              </p>
            )}
            <button type="submit" disabled={busy || !password} className="btn-red w-full">
              {busy ? "Checking…" : "Enter site"} <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
