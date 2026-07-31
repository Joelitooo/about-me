import { describe, expect, it } from "vitest";

import { getClientIp } from "./client-ip";

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP over the socket address", () => {
    expect(
      getClientIp({
        headers: { "cf-connecting-ip": "203.0.113.7" },
        ip: "172.18.0.5",
      }),
    ).toBe("203.0.113.7");
  });

  it("ignores a spoofable X-Forwarded-For", () => {
    expect(
      getClientIp({
        headers: { "x-forwarded-for": "1.2.3.4" },
        ip: "172.18.0.5",
      }),
    ).toBe("172.18.0.5");
  });

  it("falls back to req.ip when the header is absent or blank", () => {
    expect(getClientIp({ headers: {}, ip: "127.0.0.1" })).toBe("127.0.0.1");
    expect(getClientIp({ headers: { "cf-connecting-ip": "  " }, ip: "127.0.0.1" })).toBe(
      "127.0.0.1",
    );
  });

  it("never returns undefined", () => {
    expect(getClientIp({})).toBe("unknown");
  });
});
