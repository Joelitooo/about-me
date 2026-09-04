import { expect, test } from "@playwright/test";

test("home page renders hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();

  // Scoped to the nav and exact: "Work" is a substring of the hero's "See my work" CTA.
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  for (const label of ["About", "Work"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
});

test("dark mode toggle works", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const wasDark = await html.evaluate((el) => el.classList.contains("dark"));
  await page.getByRole("button", { name: /dark mode|light mode/i }).click();
  const isDark = await html.evaluate((el) => el.classList.contains("dark"));
  expect(isDark).toBe(!wasDark);
});

test("palette toggle persists on the document", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-palette", "paper");
  await page.getByRole("button", { name: /slate theme|motyw slate|tema ardósia/i }).click();
  await expect(html).toHaveAttribute("data-palette", "slate");
});

test("React logo opens the found-me easter egg", async ({ page }) => {
  await page.goto("/");
  const reactLogo = page.getByRole("button", { name: "React" });
  await expect(reactLogo).toBeVisible();
  // The mark floats with an infinite CSS animation, so Playwright never sees a
  // stable box. Real clicks still land; force skips that actionability check.
  await reactLogo.click({ force: true });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/videographer for 10 years/i)).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("work architecture graph is click-to-inspect", async ({ page }) => {
  await page.goto("/");
  const work = page.locator("#work");
  await work.scrollIntoViewIfNeeded();
  await expect(work.getByRole("heading", { name: "Portfolio monorepo" })).toBeVisible();

  const canvas = work.locator(".react-flow");
  await expect(canvas).toBeVisible();
  await work.locator('.react-flow__node[data-id="web"]').click();
  await expect(work.getByText(/static Vite build served by nginx/i)).toBeVisible();
});
