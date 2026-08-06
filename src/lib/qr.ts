import { renderSVG } from "uqr";

export function renderQrDataUrl(value: string) {
  const svg = renderSVG(value, { ecc: "M", border: 2 });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
