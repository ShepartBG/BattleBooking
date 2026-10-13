import { test, expect } from "@playwright/test";
import { acceptCookies, settle, supabaseAccessToken, watchPage } from "./helpers";

test("create a test game through UI, verify it, then delete it", async ({ page, request, baseURL }) => {
  const host = new URL(baseURL || "http://127.0.0.1:3000").hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const allowMutations = process.env.TEST_ALLOW_MUTATIONS === "1";

  if (!isLocal && !allowMutations) {
    throw new Error(
      "За безопасност full тестът променя данни само на localhost. За друг адрес сложи TEST_ALLOW_MUTATIONS=1."
    );
  }

  const verify = watchPage(page);
  const title = `E2E TEST ${Date.now()}`;

  await page.goto("/admin/new-game");
  await settle(page);

  const fieldSelect = page.locator("select").filter({
    has: page.locator("option", { hasText: "Избери игрище" }),
  });
  await expect(fieldSelect).toBeVisible();
  // Fields load asynchronously after the select is rendered.
  await expect
    .poll(() => fieldSelect.locator("option").count(), { message: "Няма налично игрище в admin профила.", timeout: 15_000 })
    .toBeGreaterThan(1);

  if (!(await fieldSelect.inputValue())) {
    const firstValue = await fieldSelect.locator("option").nth(1).getAttribute("value");
    if (firstValue) await fieldSelect.selectOption(firstValue);
  }

  await page.getByPlaceholder("Напр. Неделна игра").fill(title);
  await acceptCookies(page);
  await page.getByRole("button", { name: "СЪЗДАЙ ИГРА" }).click();

  await expect(page.locator("body")).toContainText("Играта е създадена успешно", {
    timeout: 15_000,
  });

  const token = await supabaseAccessToken(page);
  expect(token, "Не беше намерен Supabase access token след login.").toBeTruthy();

  const listResponse = await request.get(`${baseURL}/api/admin/games`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(listResponse.ok()).toBeTruthy();
  const listJson = await listResponse.json();
  const game = (listJson.games || []).find((g: any) => g.title === title);
  expect(game, "Създадената тестова игра не беше намерена от admin API.").toBeTruthy();

  const publicResponse = await request.get(`${baseURL}/api/public-game/${game.id}`);
  expect(publicResponse.status()).toBeLessThan(500);

  const deleteResponse = await request.delete(`${baseURL}/api/admin/games`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: { id: game.id },
  });
  expect(deleteResponse.ok()).toBeTruthy();

  const afterResponse = await request.get(
    `${baseURL}/api/admin/games?id=${encodeURIComponent(game.id)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect([403, 404, 500]).toContain(afterResponse.status());

  await verify();
});
