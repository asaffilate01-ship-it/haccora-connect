export function assertSafeWebhookUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("webhook URL must use HTTPS without credentials");
  }
  if (url.port && url.port !== "443") {
    throw new Error("webhook URL must use port 443");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    hostname.includes(":")
  ) {
    throw new Error("private webhook hosts are not allowed");
  }
  const octets = hostname.split(".").map(Number);
  if (
    octets.length === 4 &&
    octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  ) {
    const [a, b] = octets;
    if (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      throw new Error("private webhook IPs are not allowed");
    }
  }
  return url;
}
