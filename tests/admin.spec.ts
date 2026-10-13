import { expect, test } from "@playwright/test";
import { settle, supabaseAccessToken, watchPage } from "./helpers";

// Organizer/admin pages. Owner-only pages are tested separately in owner.spec.ts.
const adminPages = [
  "/admin",
  "/admin/calendar",
  "/admin/fields",
  "/admin/gallery",
  "/admin/new-game",
  "/admin/requests",
  "/admin/settings",
  "/admin/stats",
];

for (const path of adminPages) {
  test(`admin ${path}`, async ({ page }) => {
    const verify = watchPage(page);
    const response = await page.goto(path);
    expect(response?.status() ?? 200, `${path} returned an HTTP error`).toBeLessThan(500);
    await settle(page);
    await verify();
  });
}

test("organizer is denied owner-only admin APIs", async ({ page, request, baseURL }) => {
  await page.goto("/admin");
  await settle(page);

  const token = await supabaseAccessToken(page);
  expect(token, "Не беше намерен Supabase access token след organizer login.").toBeTruthy();

  for (const path of ["/api/admin/events", "/api/admin/shops"]) {
    const response = await request.get(`${baseURL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status(), `${path} трябва да е owner-only за organizer профил`).toBe(403);
  }
});

test("admin menu links do not point to missing pages", async ({ page }) => {
  test.setTimeout(60_000);

  const verify = watchPage(page);
  await page.goto("/admin");
  await settle(page);

  const hrefs = await page.locator('a[href^="/admin"]').evaluateAll((nodes) =>
    Array.from(
      new Set(
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute("href") || "")
          .filter(Boolean)
      )
    )
  );

  const ownerOnly = new Set(["/admin/events", "/admin/shops"]);

  for (const href of hrefs) {
    const cleanHref = href.split("?")[0].split("#")[0];
    if (ownerOnly.has(cleanHref)) continue;

    const response = await page.goto(href);
    expect(response?.status() ?? 200, `${href} returned an HTTP error`).toBeLessThan(500);
    await settle(page);
    await expect(page.locator("body"), `${href} rendered an error page`).not.toContainText(
      /404|This page could not be found|Application error|Unhandled Runtime Error/i
    );
  }

  await verify();
});
