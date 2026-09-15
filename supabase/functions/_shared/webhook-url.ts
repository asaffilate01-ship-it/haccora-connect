export function assertSafeWebhookUrl(value: string): URL {
  if (value.length > 2048) {
    throw new Error("webhook URL is too long");
  }
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("webhook URL must use HTTPS without credentials");
  }
  if (url.port && url.port !== "443") {
    throw new Error("webhook URL must use port 443");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname.includes(".") ||
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname === "host.docker.internal" ||
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
    throw new Error(
      "private webhook IPs are not allowed; direct IP literals are not supported",
    );
  }
  return url;
}
