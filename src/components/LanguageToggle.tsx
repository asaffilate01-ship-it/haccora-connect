import { useI18n, type Language } from "@/lib/i18n";

export function LanguageToggle({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const { lang, setLang } = useI18n();
  const dark = variant === "dark";
  const Btn = ({ code, label }: { code: Language; label: string }) => (
    <button
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide transition ${
        lang === code
          ? dark
            ? "bg-white text-black"
            : "bg-black text-white"
          : dark
            ? "text-white/70 hover:text-white"
            : "text-black/60 hover:text-black"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-full border ${
        dark ? "border-white/25 bg-white/5" : "border-black/15 bg-white"
      } ${className}`}
    >
      <Btn code="de" label="DE" />
      <Btn code="en" label="EN" />
    </div>
  );
}
