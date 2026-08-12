export function LanguageToggle({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <span
      role="note"
      title="Haccora is available in UK English"
      className={`inline-flex select-none cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 ${dark ? "border-white/25 bg-white/5 text-white" : "border-black/15 bg-white text-black"} ${className}`}
    >
      <span className="sr-only">Language:</span>
      <span aria-hidden="true" className="text-[0.65rem] font-semibold uppercase tracking-widest opacity-70">
        Lang
      </span>
      <span className="text-xs font-bold">UK English</span>
    </span>
  );
}
