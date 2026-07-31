import { expect, test } from "@playwright/test";

test.describe("production stack", () => {
  test.skip(
    process.env.PLAYWRIGHT_EXTERNAL_SERVER !== "1",
    "Production checks require the Compose/nginx stack",
  );

  test("serves health and deep SPA routes", async ({ page, request }) => {
    const health = await request.get("/healthz");
    expect(health.status()).toBe(200);
    expect((await health.text()).trim()).toBe("ok");

    const response = await page.goto("/projects");
    expect(response?.status()).toBe(200);
    await expect(page.locator("#root")).not.toBeEmpty();
  });

  test("sends hardened browser response headers", async ({ request }) => {
    const response = await request.get("/");

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "script-src 'self' https://analytics.joelitoo.com",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  test("loads without uncaught errors or failed same-origin assets", async ({ page }) => {
    const errors: string[] = [];
    const failedAssets: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => {
      const requestUrl = new URL(request.url());
      const pageUrl = new URL(page.url());

      if (
        requestUrl.origin === pageUrl.origin &&
        ["document", "script", "stylesheet", "font", "image"].includes(request.resourceType())
      ) {
        failedAssets.push(
          `${request.method()} ${requestUrl.pathname}: ${
            request.failure()?.errorText ?? "unknown failure"
          }`,
        );
      }
    });

    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
  });
});
