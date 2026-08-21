import brandLogo from "@/assets/haccora-brand.png.asset.json";

/**
 * Official Haccora lockup — shield mark, "Haccora" wordmark and the
 * Safe. Clean. Compliant. slogan, served from the CDN.
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
  return (
    <img
      src={brandLogo.url}
      alt={decorative ? "" : title}
      aria-hidden={decorative ? true : undefined}
      className={`${className} object-contain ${light ? "brightness-0 invert" : ""}`}
      loading="eager"
      decoding="async"
    />
  );
}
