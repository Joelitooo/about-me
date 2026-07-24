import { describe, it, expect } from "vitest";
import type { ContactMessageDto, HealthStatus } from "./index.js";

describe("shared contracts", () => {
  it("accepts a well-formed contact message", () => {
    const msg: ContactMessageDto = {
      name: "Ada",
      email: "ada@example.com",
      message: "Hello!",
    };
    expect(msg.email).toContain("@");
  });

  it("models a healthy status", () => {
    const health: HealthStatus = { status: "ok", uptimeSeconds: 1 };
    expect(health.status).toBe("ok");
  });
});
