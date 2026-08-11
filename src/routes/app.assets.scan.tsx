import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { IScannerControls } from "@zxing/browser";
import { ArrowLeft, Camera, Keyboard, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/assets/scan")({ component: AssetScannerPage });

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assetToken(value: string): string | null {
  const input = value.trim();
  if (TOKEN.test(input)) return input;
  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/app\/assets\/([^/]+)\/?$/);
    if (
      ["haccora:", "haccorauk:"].includes(url.protocol) &&
      url.hostname === "assets" &&
      TOKEN.test(url.pathname.slice(1))
    )
      return url.pathname.slice(1);
    if (
      match &&
      TOKEN.test(match[1]) &&
      (url.origin === window.location.origin || ["haccora:", "haccorauk:"].includes(url.protocol))
    )
      return match[1];
  } catch {
    const deepLink = input.match(/^haccora(?:uk)?:\/\/assets\/([^/]+)\/?$/i);
    if (deepLink && TOKEN.test(deepLink[1])) return deepLink[1];
  }
  return null;
}

function AssetScannerPage() {
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [manual, setManual] = useState("");
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openValue = async (value: string, source: "web_camera" | "manual_token") => {
    const token = assetToken(value);
    if (!token) {
      setError("This is not a valid Haccora equipment QR code or token.");
      return;
    }
    controls.current?.stop();
    setRegistering(true);
    setError(null);
    const position = await currentPosition();
    const { data, error: scanError } = await (supabase as any).rpc("record_asset_scan", {
      p_qr_token: token,
      p_source: source,
      p_client_scanned_at: new Date().toISOString(),
      p_latitude: position?.latitude ?? null,
      p_longitude: position?.longitude ?? null,
      p_accuracy_metres: position?.accuracy ?? null,
    });
    setRegistering(false);
    if (scanError || !data?.scan_session_id) {
      setError(scanError?.message ?? "The equipment scan could not be registered.");
      return;
    }
    try {
      window.sessionStorage.setItem(`haccora-asset-scan:${token}`, JSON.stringify(data));
    } catch {
      // The asset still opens when private storage is unavailable; the scan remains audited.
    }
    void navigate({ to: "/app/assets/$assetId", params: { assetId: token } });
  };

  const stop = () => {
    controls.current?.stop();
    controls.current = null;
    setActive(false);
  };

  const start = async () => {
    if (!video.current) return;
    stop();
    setStarting(true);
    setError(null);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      controls.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video.current,
        (result) => {
          if (result) void openValue(result.getText(), "web_camera");
        },
      );
      setActive(true);
    } catch {
      setError(
        "Camera access was unavailable. Allow camera permission, use HTTPS, or enter the QR token below.",
      );
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => () => controls.current?.stop(), []);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-7">
      <header>
        <Link
          to="/app/assets"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ArrowLeft size={13} /> Equipment
        </Link>
        <div className="eyebrow mt-4">Protected equipment QR</div>
        <h1 className="mt-1 text-2xl md:text-3xl">Scan. Check. Record.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Point the camera at a Haccora label to open that item’s details, due checks and complete
          timestamped history.
        </p>
      </header>

      <section className="surface overflow-hidden">
        <div className="relative aspect-[4/3] bg-foreground md:aspect-video">
          <video ref={video} className="h-full w-full object-cover" muted playsInline />
          {!active && (
            <div className="absolute inset-0 grid place-items-center bg-foreground text-background">
              <div className="text-center">
                <QrCode className="mx-auto" size={40} />
                <p className="mt-3 text-sm">Camera starts only when you choose.</p>
              </div>
            </div>
          )}
          {active && (
            <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
          )}
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          <button className="btn-alert-solid min-h-11 flex-1 text-sm" onClick={() => void start()}>
            {starting ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
            {active ? "Restart camera" : "Start camera"}
          </button>
          {active && (
            <button className="btn-secondary min-h-11 text-sm" onClick={stop}>
              Stop
            </button>
          )}
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="surface p-4">
        <div className="flex items-center gap-2">
          <Keyboard size={16} />
          <h2 className="text-sm font-bold">Enter token instead</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the UUID printed below the QR if the label is damaged or camera access is blocked.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="field min-h-11 flex-1 font-mono text-sm"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void openValue(manual, "manual_token")}
            placeholder="00000000-0000-4000-8000-000000000000"
            autoCapitalize="none"
          />
          <button
            disabled={registering}
            className="btn-secondary min-h-11 text-sm disabled:opacity-60"
            onClick={() => void openValue(manual, "manual_token")}
          >
            {registering ? <Loader2 className="animate-spin" size={15} /> : null} Open record
          </button>
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 shrink-0" size={14} /> A QR identifies an item; it does not
        bypass sign-in, site permissions or inspector scope. GPS is requested only after a valid
        label is read; denial records the scan without coordinates.
      </p>
    </div>
  );
}

function currentPosition(): Promise<
  { latitude: number; longitude: number; accuracy: number } | undefined
> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 },
    );
  });
}
