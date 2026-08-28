import { useEffect, useState } from "react";
import { Clock3, Play } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductTourDialog() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={!mounted}
          className="group inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-black/80 px-3 py-2.5 text-left text-sm text-white shadow-xl backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:px-4 md:py-3"
          aria-label={`${t("hero.video.title")}. ${t("hero.play")}.`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-alert-red)] shadow-[0_0_0_6px_rgba(255,255,255,0.06)] transition group-hover:scale-105 md:h-9 md:w-9">
            <Play size={15} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-bold md:text-sm">{t("hero.video.title")}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#4ade80] md:text-xs">
              <Clock3 size={11} aria-hidden="true" />
              {t("hero.video.duration")} · {t("hero.play")}
            </span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-5xl overflow-y-auto border-white/10 bg-[#0d0d0d] p-3 text-white shadow-2xl sm:p-5">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-lg font-black sm:text-xl">
            {t("hero.video.modalTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-white/65 sm:text-sm">
            {t("hero.video.description")}
          </DialogDescription>
        </DialogHeader>
        <video
          controls
          playsInline
          preload="metadata"
          poster="/media/haccora-product-tour-poster.jpg"
          className="aspect-video w-full rounded-xl border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.4)]"
          aria-label={t("hero.video.modalTitle")}
        >
          <source src="/media/haccora-product-tour.mp4" type="video/mp4" />
          <track
            default
            kind="captions"
            src="/media/haccora-product-tour.en.vtt"
            srcLang="en-GB"
            label="English"
          />
          {t("hero.video.unsupported")}
        </video>
        <details className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/75 sm:text-sm">
          <summary className="cursor-pointer font-bold text-white">
            {t("hero.video.transcriptTitle")}
          </summary>
          <p className="mt-2 leading-relaxed">{t("hero.video.transcript")}</p>
        </details>
      </DialogContent>
    </Dialog>
  );
}
