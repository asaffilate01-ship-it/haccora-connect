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
      src={light ? "/brand/haccora-wordmark-light-v2.png" : "/brand/haccora-wordmark-v2.png"}
      alt={decorative ? "" : title}
      aria-hidden={decorative ? true : undefined}
      className={`${className} object-contain`}
      width={720}
      height={208}
      loading="eager"
      decoding="async"
    />
  );
}
