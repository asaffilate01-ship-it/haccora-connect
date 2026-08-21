import { Link } from "@tanstack/react-router";
import { BrandLogoArtwork } from "@/components/BrandLogoArtwork";

/** Canonical Haccora wordmark: shield, "Haccora" and the Safe. Clean. Compliant. slogan. */
export const BRAND_SLOGAN = "Safe. Clean. Compliant.";

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  to?: string;
  ariaLabel?: string;
  /** Use the light artwork (white slogan/shield detail) on dark backgrounds. */
  light?: boolean;
}

function LogoArtwork({
  className,
  label,
  light,
  decorative = false,
}: {
  className: string;
  label: string;
  light?: boolean;
  decorative?: boolean;
}) {
  return (
    <BrandLogoArtwork
      className={className}
      title={`${label} — ${BRAND_SLOGAN}`}
      decorative={decorative}
      light={light}
    />
  );
}

/**
 * Portable Haccora logo. Wrapped in a link by default;
 * pass to={""} or use <BrandLogoImage/> to skip the link.
 */
export function BrandLogo({
  className = "",
  imgClassName = "h-10 md:h-12 w-auto",
  to = "/",
  ariaLabel = "Haccora",
  light = false,
}: BrandLogoProps) {
  const artwork = (
    <LogoArtwork
      className={imgClassName}
      label={ariaLabel}
      light={light}
      decorative={Boolean(to)}
    />
  );
  if (!to) return <span className={className}>{artwork}</span>;
  return (
    <Link to={to} aria-label={ariaLabel} className={`inline-flex items-center ${className}`}>
      {artwork}
    </Link>
  );
}

export function BrandLogoImage({
  className = "h-10 w-auto",
  alt = "Haccora",
  light = false,
}: {
  className?: string;
  alt?: string;
  light?: boolean;
}) {
  return <LogoArtwork className={className} label={alt} light={light} />;
}
