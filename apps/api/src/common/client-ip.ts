const CF_CONNECTING_IP = "cf-connecting-ip";

/**
 * Cloudflare overwrites CF-Connecting-IP, so it cannot be spoofed by the client;
 * X-Forwarded-For is only appended to and therefore is not safe to trust here.
 * The fallback matters for local runs and tests, where the header is absent.
 */
export function getClientIp(req: Record<string, unknown>): string {
  const headers = (req.headers ?? {}) as Record<
    string,
    string | string[] | undefined
  >;
  const header = headers[CF_CONNECTING_IP];
  const candidate = (Array.isArray(header) ? header[0] : header)?.trim();

  if (candidate) {
    return candidate;
  }

  return typeof req.ip === "string" && req.ip.length > 0 ? req.ip : "unknown";
}
