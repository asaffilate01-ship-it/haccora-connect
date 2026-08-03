import { useState } from "react";
import {
  Facebook,
  Linkedin,
  Mail,
  Link as LinkIcon,
  Check,
  Instagram,
  Youtube,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** X (Twitter) logo — lucide doesn't ship a monogram X icon. */
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.53 7.46L22 22h-6.828l-4.77-6.24L4.8 22H2l7.02-8.02L2 2h6.914l4.32 5.71L18.244 2zm-2.393 18h1.885L7.24 4H5.24l10.61 16z" />
    </svg>
  );
}
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.52 3.48A11.9 11.9 0 0012.06 0C5.5 0 .18 5.32.18 11.88c0 2.09.55 4.13 1.6 5.93L0 24l6.35-1.67a11.86 11.86 0 005.71 1.46h.01c6.56 0 11.88-5.32 11.88-11.88 0-3.18-1.24-6.16-3.43-8.43zM12.07 21.8h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.22-3.77.99 1.01-3.67-.24-.38a9.86 9.86 0 01-1.5-5.26c0-5.46 4.44-9.9 9.92-9.9 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 012.9 7.01c0 5.46-4.44 9.91-9.91 9.91zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48 1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.07 4.48.71.31 1.26.5 1.69.64.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}

interface Props {
  url: string;
  title: string;
  compact?: boolean;
}

export function ShareBar({ url, title, compact }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const abs = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
  const enc = encodeURIComponent;

  const items = [
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(abs)}`,
      Icon: XIcon,
    },
    {
      key: "li",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(abs)}`,
      Icon: Linkedin,
    },
    {
      key: "fb",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(abs)}`,
      Icon: Facebook,
    },
    {
      key: "wa",
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(title + " " + abs)}`,
      Icon: WhatsAppIcon,
    },
    {
      key: "mail",
      label: "Email",
      href: `mailto:?subject=${enc(title)}&body=${enc(abs)}`,
      Icon: Mail,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(abs);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-wrap items-center gap-3"}>
      {!compact && (
        <span className="text-xs font-black uppercase tracking-widest text-black/60">
          {t("blog.share") ?? "Share"}
        </span>
      )}
      {items.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white hover:bg-[color:var(--color-alert-red)] transition"
        >
          <Icon size={16} />
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label={t("blog.copyLink") ?? "Copy link"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white hover:bg-[color:var(--color-alert-green)] transition"
      >
        {copied ? <Check size={16} /> : <LinkIcon size={16} />}
      </button>
    </div>
  );
}

export function FollowBar({ dark = false }: { dark?: boolean }) {
  const cls = dark
    ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-[color:var(--color-alert-red)] transition"
    : "inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white hover:bg-[color:var(--color-alert-red)] transition";
  const items: { label: string; href: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/haccora", Icon: Linkedin },
    { label: "X", href: "https://twitter.com/haccora", Icon: XIcon },
    { label: "Instagram", href: "https://instagram.com/haccora", Icon: Instagram },
    { label: "Facebook", href: "https://facebook.com/haccora", Icon: Facebook },
    { label: "YouTube", href: "https://youtube.com/@haccora", Icon: Youtube },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cls}
        >
          <Icon size={16} />
        </a>
      ))}
    </div>
  );
}
