/**
 * Official Haccora lockup — shield mark, "Haccora" wordmark and the
 * Safe. Clean. Compliant. slogan, served from canonical first-party assets.
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
      src={light ? "/brand/haccora-logo-light.svg" : "/brand/haccora-logo.svg"}
      alt={decorative ? "" : title}
      aria-hidden={decorative ? true : undefined}
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
    />
  );
}
