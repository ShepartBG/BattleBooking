import { test, expect } from "@playwright/test";
import { settle, watchPage } from "./helpers";

const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/cookies",
  "/events",
  "/fields",
  "/games",
  "/login",
  "/privacy",
  "/register-field",
  "/shops",
  "/terms",
];

for (const route of publicRoutes) {
  test(`public ${route}`, async ({ page }) => {
    const verify = watchPage(page);
    const response = await page.goto(route);
    expect(response?.status(), `${route} returned bad status`).toBeLessThan(500);
    await settle(page);
    await verify();
  });
}

for (const directory of ["/games", "/fields"]) {
  test(`first dynamic link from ${directory}`, async ({ page }) => {
    const verify = watchPage(page);
    await page.goto(directory);
    await settle(page);

    const pattern = directory === "/games" ? /^\/game\// : /^\/field\//;
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute("href") || "")
    );
    const href = hrefs.find((x) => pattern.test(x));

    if (href) {
      const response = await page.goto(href);
      expect(response?.status()).toBeLessThan(500);
      await settle(page);
    }
    await verify();
  });
}
