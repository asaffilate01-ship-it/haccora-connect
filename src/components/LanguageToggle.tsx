export function LanguageToggle({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <div
      aria-label="Market language"
      className={`inline-flex items-center rounded-full border ${dark ? "border-white/25 bg-white/5 text-white" : "border-black/15 bg-white text-black"} ${className}`}
    >
      <span className="px-2.5 py-1 text-xs font-bold">UK English</span>
    </div>
  );
}
