import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";

const authFile = "playwright/.auth/owner.json";

setup("authenticate BattleBooking owner", async ({ page }) => {
  const email = process.env.TEST_OWNER_EMAIL?.trim();
  const password = process.env.TEST_OWNER_PASSWORD || "";

  if (!email || !password) {
    throw new Error(
      "Липсват TEST_OWNER_EMAIL / TEST_OWNER_PASSWORD в .env.test.local"
    );
  }

  fs.mkdirSync("playwright/.auth", { recursive: true });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^ВХОД$/i }).click();

  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 20_000 });
  await expect(page.locator("body")).not.toContainText(/грешен имейл|грешна парола/i);
  await page.context().storageState({ path: authFile });
});
