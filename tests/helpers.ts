import { expect, Page } from "@playwright/test";

export function watchPage(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  const forbiddenErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    const line = `${status} ${response.request().method()} ${response.url()}`;
    if (status >= 500) serverErrors.push(line);
    if (status === 401 || status === 403) forbiddenErrors.push(line);
  });

  return async () => {
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
    expect(pageErrors, `Client-side exceptions:\n${pageErrors.join("\n")}`).toEqual([]);
    expect(serverErrors, `HTTP 5xx responses:\n${serverErrors.join("\n")}`).toEqual([]);
    expect(forbiddenErrors, `HTTP 401/403 responses:\n${forbiddenErrors.join("\n")}`).toEqual([]);

    const meaningful = consoleErrors.filter(
      (x) =>
        !x.includes("preloaded using link preload") &&
        !x.includes("favicon.ico") &&
        !x.includes("Failed to load resource: the server responded with a status of 403") &&
        !x.includes("Failed to load resource: the server responded with a status of 401")
    );
    expect(meaningful, `console.error output:\n${meaningful.join("\n")}`).toEqual([]);
  };
}

export async function acceptCookies(page: Page) {
  const candidates = [
    page.getByRole("button", { name: /приемам/i }),
    page.getByRole("button", { name: /приеми/i }),
    page.getByRole("button", { name: /съгласен/i }),
    page.getByRole("button", { name: /разбрах/i }),
    page.getByRole("button", { name: /accept/i }),
  ];

  for (const locator of candidates) {
    if (await locator.first().isVisible().catch(() => false)) {
      await locator.first().click();
      await page.waitForTimeout(250);
      return;
    }
  }

  // Fallback: hide only the known fixed cookie banner if its button wording changes.
  const banner = page.locator("div.fixed.inset-x-3.bottom-3.z-50").filter({
    hasText: /бисквитки|локално съхранение/i,
  });
  if (await banner.isVisible().catch(() => false)) {
    const button = banner.locator("button").last();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(250);
    }
  }
}

export async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
  await acceptCookies(page);
}

export async function supabaseAccessToken(page: Page): Promise<string> {
  return await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token =
          parsed?.access_token ||
          parsed?.currentSession?.access_token ||
          parsed?.session?.access_token;
        if (token) return String(token);
      } catch {}
    }
    return "";
  });
}
