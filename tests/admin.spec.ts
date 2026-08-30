import { test, expect } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const adminRoutes = [
  "/admin",
  "/admin/calendar",
  "/admin/events",
  "/admin/fields",
  "/admin/gallery",
  "/admin/new-game",
  "/admin/requests",
  "/admin/settings",
  "/admin/shops",
  "/admin/stats",
];

for (const route of adminRoutes) {
  test(`admin ${route}`, async ({ page }) => {
    const verify = watchPage(page);
    const response = await page.goto(route);
    expect(response?.status(), `${route} returned bad status`).toBeLessThan(500);
    await settle(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("Application error");

    await verify();
  });
}

test("admin menu links do not point to missing pages", async ({ page }) => {
  const verify = watchPage(page);
  await page.goto("/admin");
  await settle(page);

  const hrefs = Array.from(
    new Set(
      await page.locator('a[href^="/admin"]').evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href") || "")
      )
    )
  ).filter(Boolean);

  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), `${href} returned bad status`).toBeLessThan(500);
    await settle(page);
    expect(page.url()).not.toContain("/login");
  }

  await verify();
});
