import { Link } from "@tanstack/react-router";

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  to?: string;
  ariaLabel?: string;
}

function LogoArtwork({
  className,
  label,
  decorative = false,
}: {
  className: string;
  label: string;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 360 84"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      preserveAspectRatio="xMinYMid meet"
    >
      <path d="M42 4 73 16v23c0 19-12 33-31 41C23 72 11 58 11 39V16L42 4Z" fill="#c8102e" />
      <path
        d="m27 41 10 10 21-24"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="91"
        y="43"
        fill="currentColor"
        fontFamily="Archivo Black, Archivo, Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="38"
        fontWeight="900"
        letterSpacing="1"
      >
        HACCORA
      </text>
      <text
        x="93"
        y="64"
        fill="currentColor"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="2.4"
      >
        SICHER · SAUBER · NACHWEISBAR
      </text>
    </svg>
  );
}

/**
 * Portable Haccora shield, wordmark and slogan. Kept in the repository so
 * deployments never depend on a Lovable-only asset URL.
 * Wrapped in a link by default; pass to={""} or use <BrandLogoImage/> to skip the link.
 */
export function BrandLogo({
  className = "",
  imgClassName = "h-10 md:h-12 w-auto",
  to = "/",
  ariaLabel = "Haccora",
}: BrandLogoProps) {
  const artwork = (
    <LogoArtwork className={imgClassName} label={ariaLabel} decorative={Boolean(to)} />
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
}: {
  className?: string;
  alt?: string;
}) {
  return <LogoArtwork className={className} label={alt} />;
}
