import { expect, test } from "@playwright/test";
import { settle, supabaseAccessToken, watchPage } from "./helpers";

const ownerPages = [
  "/admin",
  "/admin/events",
  "/admin/shops",
  "/admin/requests",
  "/admin/fields",
];

for (const path of ownerPages) {
  test(`owner ${path}`, async ({ page }) => {
    const verify = watchPage(page);
    const response = await page.goto(path);
    expect(response?.status() ?? 200, `${path} returned an HTTP error`).toBeLessThan(500);
    await settle(page);
    await verify();
  });
}

test("owner can access owner-only admin APIs", async ({ page, request, baseURL }) => {
  await page.goto("/admin");
  await settle(page);

  const token = await supabaseAccessToken(page);
  expect(token, "Не беше намерен Supabase access token след owner login.").toBeTruthy();

  for (const path of ["/api/admin/events", "/api/admin/shops"]) {
    const response = await request.get(`${baseURL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status(), `${path} трябва да е достъпен за owner`).toBe(200);
  }
});
