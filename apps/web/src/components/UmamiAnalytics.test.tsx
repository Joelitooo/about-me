import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UmamiAnalytics } from "./UmamiAnalytics.js";

describe("UmamiAnalytics", () => {
  afterEach(() => {
    document.head.querySelectorAll("script[umamiPortfolio]").forEach((el) => el.remove());
    vi.unstubAllEnvs();
  });

  it("does not inject a script when env vars are missing", () => {
    vi.stubEnv("VITE_UMAMI_URL", "");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "");

    render(<UmamiAnalytics />);

    expect(document.querySelector("script[umamiPortfolio]")).toBeNull();
  });

  it("injects the Umami script when both env vars are set", async () => {
    vi.stubEnv("VITE_UMAMI_URL", "http://localhost:3001");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "11111111-1111-1111-1111-111111111111");

    render(<UmamiAnalytics />);

    await waitFor(() => {
      const script = document.querySelector("script[umamiPortfolio]");
      expect(script).not.toBeNull();
      expect(script?.getAttribute("src")).toBe("http://localhost:3001/script.js");
      expect(script?.getAttribute("data-website-id")).toBe("11111111-1111-1111-1111-111111111111");
    });
  });
});
