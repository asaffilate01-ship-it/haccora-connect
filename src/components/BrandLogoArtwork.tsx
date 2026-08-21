/**
 * Vector Haccora lockup — shield mark, "Haccora" wordmark and the
 * Safe. Clean. Compliant. slogan. Rendered inline so the site webfonts
 * apply and the artwork stays crisp at any size / pixel density.
 */
export function BrandLogoArtwork({
  className = "h-10 w-auto",
  title = "Haccora — Safe. Clean. Compliant.",
  decorative = false,
  light = false,
}: {
  className?: string;
  title?: string;
  decorative?: boolean;
  light?: boolean;
}) {
  const red = "#d0102f";
  const navy = light ? "#ffffff" : "#132244";
  const accent = "#f4623a";

  return (
    <svg
      viewBox="0 0 800 200"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      {!decorative && <title>{title}</title>}
      {/* shield — red left half */}
      <path
        d="M18 62c0-7 4-13 10-15L86 26c5-2 10 2 10 7v134c0 6-6 10-11 8l-56-24c-7-3-11-10-11-18V62Z"
        fill={red}
      />
      {/* shield — navy right half */}
      <path
        d="M104 33c0-5 5-9 10-7l58 21c6 2 10 8 10 15v71c0 8-4 15-11 18l-56 24c-5 2-11-2-11-8V33Z"
        fill={light ? "#0d1a36" : "#132244"}
      />
      {/* tick */}
      <path
        d="M46 108 84 140 168 60"
        fill="none"
        stroke="#ffffff"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* wordmark */}
      <text
        x="214"
        y="112"
        fill={red}
        fontFamily='"Archivo Black", "Archivo", ui-sans-serif, system-ui, sans-serif'
        fontSize="96"
        fontWeight="900"
        letterSpacing="-2"
      >
        Haccora
      </text>
      {/* slogan */}
      <text
        x="216"
        y="166"
        fill={navy}
        fontFamily='"Archivo", "Inter", ui-sans-serif, system-ui, sans-serif'
        fontSize="42"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        Safe<tspan fill={accent}>.</tspan> Clean<tspan fill={accent}>.</tspan> Compliant
        <tspan fill={accent}>.</tspan>
      </text>
    </svg>
  );
}
