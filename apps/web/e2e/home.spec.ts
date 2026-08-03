import { expect, test } from "@playwright/test";

test("home page renders hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();

  // Scoped to the nav and exact: "Work" is a substring of the hero's "See my work" CTA.
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  for (const label of ["About", "Work", "Contact"]) {
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
