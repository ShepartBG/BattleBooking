import { test, expect, type Browser, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { acceptCookies, settle } from "./helpers";

/**
 * Full BattleBooking lifecycle, end to end, through the real UI:
 *
 *   1. Public visitor submits a field access request (/register-field)
 *   2. Owner approves it (/admin/requests) -> login account + field are created
 *   3. Organizer sets a password via the recovery link (/reset-password)
 *   4. Organizer logs in and finishes the field setup (/admin/settings)
 *   5. Organizer publishes a game (/admin/new-game)
 *   6. A player registers for the game (/game/[id])
 *   7. Organizer sees the player in the game roster (/admin/games/[id])
 *
 * Everything created here is deleted in afterAll via the service-role key.
 * Emails go to Resend's sink address (delivered+...@resend.dev), so no real inbox
 * is hit. The owner "new request" notification is stubbed in the browser unless
 * TEST_E2E_REAL_EMAILS=1.
 */

const baseHost = new URL(process.env.TEST_BASE_URL || "http://127.0.0.1:3000").hostname;
const isLocal = baseHost === "localhost" || baseHost === "127.0.0.1";
const allowMutations = isLocal || process.env.TEST_ALLOW_MUTATIONS === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const stamp = String(Date.now()).slice(-7);
const runId = Date.now().toString(36);

const data = {
  fieldName: `E2E Игрище ${stamp}`,
  ownerName: "Тест Организатор",
  city: "Тестово",
  phone: `087${stamp}`,
  email: `delivered+bb-e2e-${stamp}@resend.dev`,
  password: `E2e-${runId}-Pass!`,
  slug: `e2e-${stamp}`,
  gameTitle: `E2E Игра ${stamp}`,
  player: { first: "Тестов", last: "Играч", phone: `089${stamp}`, age: "25" },
  playerIp: `10.77.${Number(stamp.slice(-4)) % 250}.${Number(stamp.slice(-2)) + 1}`,
};

const created = {
  requestId: "",
  fieldId: "",
  gameId: "",
  userId: "",
  registrationCode: "",
};

function admin(): SupabaseClient {
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function futureDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return { ui: `${dd}.${mm}.${d.getFullYear()}`, iso: `${d.getFullYear()}-${mm}-${dd}` };
}

async function newPage(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext({ reducedMotion: "reduce", ...options });
  const page = await context.newPage();
  return { context, page };
}

async function findAuthUserId(client: SupabaseClient, email: string) {
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    const { data: list, error } = await client.auth.admin.listUsers({ page: pageNo, perPage: 1000 });
    if (error) throw error;
    const hit = (list.users as Array<{ id: string; email?: string }>).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (list.users.length < 1000) return "";
  }
  return "";
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (!allowMutations) {
    throw new Error("Lifecycle тестът създава реални данни. Извън localhost сложи TEST_ALLOW_MUTATIONS=1.");
  }
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Липсват NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Пусни с: npm run test:browser:lifecycle",
    );
  }
});

test.afterAll(async () => {
  if (!supabaseUrl || !serviceKey) return;
  const client = admin();
  const problems: string[] = [];
  const note = (label: string, error: { message: string } | null) => {
    if (error) problems.push(`${label}: ${error.message}`);
  };

  // Field may also be found through the request row if a step failed midway.
  if (!created.fieldId) {
    const { data: rows } = await client.from("field_requests").select("field_id").eq("email", data.email);
    created.fieldId = rows?.find((r) => r.field_id)?.field_id || "";
  }

  const gameIds = new Set<string>();
  if (created.gameId) gameIds.add(created.gameId);
  if (created.fieldId) {
    const { data: games } = await client.from("games").select("id").eq("field_id", created.fieldId);
    games?.forEach((g) => gameIds.add(g.id));
  }
  const { data: byTitle } = await client.from("games").select("id").eq("title", data.gameTitle);
  byTitle?.forEach((g) => gameIds.add(g.id));

  if (gameIds.size) {
    const ids = [...gameIds];
    note("registrations", (await client.from("registrations").delete().in("game_id", ids)).error);
    note("games", (await client.from("games").delete().in("id", ids)).error);
  }

  note("field_requests", (await client.from("field_requests").delete().eq("email", data.email)).error);

  if (created.fieldId) {
    note("field_images", (await client.from("field_images").delete().eq("field_id", created.fieldId)).error);
    note("fields", (await client.from("fields").delete().eq("id", created.fieldId)).error);
  }

  note("rate_limit_events", (await client.from("rate_limit_events").delete().eq("identifier", data.playerIp)).error);

  const userId = created.userId || (await findAuthUserId(client, data.email).catch(() => ""));
  if (userId) {
    const { error } = await client.auth.admin.deleteUser(userId);
    note("auth user", error);
  }

  if (problems.length) console.warn(`⚠️ Cleanup не изтри всичко:\n${problems.join("\n")}`);
});

test("пълен цикъл: заявка → одобрение → настройка → игра → записване", async ({ browser }) => {
  test.setTimeout(300_000);
  const client = admin();
  const gameDay = futureDate(7);
  let organizer: Page | null = null;

  await test.step("1. Публична заявка за достъп", async () => {
    const { context, page } = await newPage(browser);
    if (process.env.TEST_E2E_REAL_EMAILS !== "1") {
      await page.route("**/api/email/field-request", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
      );
    }

    await page.goto("/register-field");
    await settle(page);

    await page.getByPlaceholder("Airsoft Field Warzone").fill(data.fieldName);
    await page.getByPlaceholder("Християн Иванов").fill(data.ownerName);
    await page.getByPlaceholder("с. Бутан / Враца / София").fill(data.city);
    await page.getByPlaceholder("0897047668").fill(data.phone);
    await page.getByPlaceholder("field@example.com").fill(data.email);
    await page.getByPlaceholder(/Разкажи накратко за игрището/).fill("Автоматичен E2E тест. Ще бъде изтрит.");
    await page.locator('input[name="privacy_consent"]').check();

    await acceptCookies(page);
    await page.locator("form").getByRole("button", { name: "Заяви достъп" }).click();
    await expect(page.locator("body")).toContainText("Заявката е изпратена успешно", { timeout: 20_000 });

    const { data: row, error } = await client
      .from("field_requests")
      .select("id,status")
      .eq("email", data.email)
      .single();
    expect(error, error?.message).toBeNull();
    expect(row?.status).toBe("pending");
    created.requestId = row!.id;

    // Duplicate guard: same data must be rejected.
    await page.reload();
    await settle(page);
    await page.getByPlaceholder("Airsoft Field Warzone").fill(data.fieldName);
    await page.getByPlaceholder("Християн Иванов").fill(data.ownerName);
    await page.getByPlaceholder("с. Бутан / Враца / София").fill(data.city);
    await page.getByPlaceholder("0897047668").fill(data.phone);
    await page.getByPlaceholder("field@example.com").fill(data.email);
    await page.locator('input[name="privacy_consent"]').check();
    await page.locator("form").getByRole("button", { name: "Заяви достъп" }).click();
    await expect(page.locator("body")).toContainText("Вече имате изпратена заявка", { timeout: 15_000 });

    await context.close();
  });

  await test.step("2. Owner одобрява заявката", async () => {
    const { context, page } = await newPage(browser, { storageState: "playwright/.auth/owner.json" });
    await page.goto("/admin/requests");
    await settle(page);

    const card = page.locator("article").filter({ hasText: data.email });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("button", { name: "Потвърждавам" }).click();
    await expect(page.locator("body")).toContainText("Статусът е запазен", { timeout: 30_000 });
    await expect(card).toContainText("Активен");

    const { data: row } = await client
      .from("field_requests")
      .select("status,field_id,trial_started_at,subscription_valid_until")
      .eq("id", created.requestId)
      .single();
    expect(row?.status).toBe("active");
    expect(row?.field_id, "Одобрението не създаде игрище (field_id)").toBeTruthy();
    expect(row?.subscription_valid_until).toBeTruthy();
    created.fieldId = row!.field_id;

    created.userId = await findAuthUserId(client, data.email);
    expect(created.userId, "Одобрението не създаде login акаунт").toBeTruthy();

    await context.close();
  });

  await test.step("3. Организаторът задава парола през линка от имейла", async () => {
    const { data: link, error } = await client.auth.admin.generateLink({ type: "recovery", email: data.email });
    expect(error, error?.message).toBeNull();
    const tokenHash = link?.properties?.hashed_token;
    expect(tokenHash).toBeTruthy();

    const { context, page } = await newPage(browser);
    await page.goto(`/reset-password?token_hash=${encodeURIComponent(tokenHash!)}&type=recovery`);
    await settle(page);

    const inputs = page.locator('input[autocomplete="new-password"]');
    await expect(inputs.first()).toBeEnabled({ timeout: 20_000 });
    await inputs.nth(0).fill(data.password);
    await inputs.nth(1).fill(data.password);
    await page.getByRole("button", { name: "Запази новата парола" }).click();
    await expect(page.locator("body")).toContainText("Паролата е сменена успешно", { timeout: 20_000 });
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    await context.close();
  });

  await test.step("4. Вход като организатор", async () => {
    const { page } = await newPage(browser);
    organizer = page;
    await page.goto("/login");
    await settle(page);
    await page.locator('input[type="email"]').fill(data.email);
    await page.locator('input[type="password"]').fill(data.password);
    await page.getByRole("button", { name: /^вход$/i }).click();
    await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText("Контролен панел", { timeout: 20_000 });
  });

  await test.step("5. Финална настройка на игрището", async () => {
    const page = organizer!;
    await page.goto("/admin/settings");
    await settle(page);
    await expect(page.getByRole("heading", { name: "Настройки на игрището" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Име на игрището", { exact: true }).fill(data.fieldName);
    await page.getByLabel("Кратко име на игрището (URL slug)").fill(data.slug);
    await page.getByLabel("Област", { exact: true }).fill("Тестова");
    await page.getByLabel("Населено място", { exact: true }).fill(data.city);
    await page.getByLabel("Пълна локация", { exact: true }).fill(`${data.city}, област Тестова`);
    await page.getByLabel(/^Описание/).fill("E2E игрище — създадено и изтрито автоматично.");
    await page.getByLabel("Такса със собствено оборудване").fill("20 лв");
    await page.getByLabel("Такса с комплект под наем").fill("40 лв");
    await page.getByLabel("Телефон", { exact: true }).fill(data.phone);

    await page.getByRole("button", { name: "Запази настройките" }).click();
    await expect(page.locator("body")).toContainText("Запазено успешно", { timeout: 30_000 });

    // Settings survive a reload (stored server-side, not only in localStorage)
    await page.reload();
    await settle(page);
    await expect(page.getByLabel("Кратко име на игрището (URL slug)")).toHaveValue(data.slug, { timeout: 30_000 });
  });

  await test.step("5б. Настройка на терена (Игрища) — локация и комплекти по подразбиране", async () => {
    const page = organizer!;
    await page.goto("/admin/fields");
    await settle(page);
    await page.getByRole("button", { name: new RegExp(data.fieldName) }).click({ timeout: 30_000 });

    await page.getByLabel("Населено място", { exact: true }).fill(data.city);
    await page.getByLabel("Област", { exact: true }).fill("Тестова");
    await page.getByLabel("Точна локация", { exact: true }).fill(`${data.city}, област Тестова`);
    await page.getByLabel("Комплекти по подразбиране").fill("5");
    await page.getByRole("button", { name: "ЗАПАЗИ ИГРИЩЕТО" }).click();
    await expect(page.locator("body")).toContainText("Игрището е запазено успешно", { timeout: 30_000 });

    const { data: field } = await client
      .from("fields")
      .select("public_location,default_max_rental_sets")
      .eq("id", created.fieldId)
      .single();
    expect(field).toMatchObject({ public_location: `${data.city}, област Тестова`, default_max_rental_sets: 5 });
  });

  await test.step("6. Пускане на игра (анкета за записване)", async () => {
    const page = organizer!;
    await page.goto("/admin/new-game");
    await settle(page);

    const fieldSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Избери игрище" }) });
    await expect(fieldSelect).toHaveValue(created.fieldId, { timeout: 30_000 });
    // Defaults from the field profile are prefilled once the field loads.
    const rentals = page.getByLabel("Комплекти под наем");
    await expect(rentals).toHaveValue("5", { timeout: 15_000 });
    await expect(page.getByLabel("Локация", { exact: true })).toHaveValue(`${data.city}, област Тестова`);

    const title = page.getByPlaceholder("Напр. Неделна игра");
    await title.fill(data.gameTitle);
    const dateInput = page.locator(".react-datepicker-wrapper input");
    await dateInput.fill(gameDay.ui);
    await dateInput.press("Escape");
    await expect(title).toHaveValue(data.gameTitle);

    await page.getByRole("button", { name: "СЪЗДАЙ ИГРА" }).click();
    await expect(page.locator("body")).toContainText("Играта е създадена успешно", { timeout: 20_000 });
    await page.getByRole("button", { name: "Добре" }).click();

    const { data: game, error } = await client
      .from("games")
      .select("id,status,game_date,max_rental_sets,field_id")
      .eq("title", data.gameTitle)
      .single();
    expect(error, error?.message).toBeNull();
    expect(game?.field_id).toBe(created.fieldId);
    expect(game?.status).toBe("active");
    expect(game?.game_date).toBe(gameDay.iso);
    expect(game?.max_rental_sets).toBe(5);
    created.gameId = game!.id;

    await page.goto("/admin");
    await settle(page);
    await expect(page.locator("body")).toContainText(data.gameTitle, { timeout: 30_000 });
  });

  await test.step("7. Играч се записва за играта", async () => {
    const { context, page } = await newPage(browser, { extraHTTPHeaders: { "x-forwarded-for": data.playerIp } });
    await page.goto(`/game/${created.gameId}`);
    await settle(page);
    await expect(page.locator("body")).toContainText(data.gameTitle, { timeout: 30_000 });
    const counterBefore = await (await page.request.get("/api/platform-stats")).json();

    // Armory + free-spots meter reflect the 5 rental kits.
    await expect(page.getByRole("heading", { name: "Комплект под наем" })).toBeVisible();
    await expect(page.getByRole("meter").first()).toHaveAttribute("aria-valuenow", "5");
    await expect(page.locator("body")).toContainText("До началото на мисията");

    await page.getByPlaceholder("Име / First name").fill(data.player.first);
    await page.getByPlaceholder("Фамилия / Last name").fill(data.player.last);
    await page.getByPlaceholder("Телефон / Phone").fill(data.player.phone);
    await page.getByPlaceholder("Възраст / Age").fill(data.player.age);
    await page.locator('select[name="participation_type"]').selectOption("rental");

    await page.getByRole("button", { name: "ПРОЧЕТИ ИНСТРУКТАЖА" }).click();
    await page.getByRole("button", { name: "Разбрах и продължавам" }).click();
    await page.getByLabel(/Прочетох и приемам инструктажа/).check();
    await page.getByLabel(/Съгласен съм личните ми данни/).check();
    await expect(page.getByLabel("Декларацията е одобрена")).toBeVisible();
    await page.getByRole("button", { name: "ЗАПИШИ СЕ" }).click();

    await expect(page.locator("body")).toContainText("Успешна регистрация!", { timeout: 20_000 });
    await expect(page.locator("body")).toContainText("Мисията е потвърдена");
    await expect(page.locator("body")).toContainText("Комплект под наем");

    const counterAfter = await (await page.request.get("/api/platform-stats")).json();
    expect(counterAfter.totalRegistrations, "Броячът на платформата не се увеличи").toBeGreaterThanOrEqual(
      counterBefore.totalRegistrations + 1,
    );
    const code = (await page.locator("body").innerText()).match(/BB\d{4}/)?.[0] || "";
    expect(code, "Не беше показан код за регистрация").toBeTruthy();
    created.registrationCode = code;

    const { data: regs } = await client
      .from("registrations")
      .select("registration_code,participation_type,status")
      .eq("game_id", created.gameId);
    expect(regs).toHaveLength(1);
    expect(regs?.[0]).toMatchObject({ registration_code: code, participation_type: "rental", status: "active" });

    await context.close();
  });

  await test.step("8. Повторно записване със същия телефон е блокирано", async () => {
    const { context, page } = await newPage(browser, { extraHTTPHeaders: { "x-forwarded-for": data.playerIp } });
    await page.goto(`/game/${created.gameId}`);
    await settle(page);
    await page.getByPlaceholder("Име / First name").fill(data.player.first);
    await page.getByPlaceholder("Фамилия / Last name").fill(data.player.last);
    await page.getByPlaceholder("Телефон / Phone").fill(data.player.phone);
    await page.getByPlaceholder("Възраст / Age").fill(data.player.age);
    await page.locator('select[name="participation_type"]').selectOption("own");
    await page.getByRole("button", { name: "ПРОЧЕТИ ИНСТРУКТАЖА" }).click();
    await page.getByRole("button", { name: "Разбрах и продължавам" }).click();
    await page.getByLabel(/Прочетох и приемам инструктажа/).check();
    await page.getByLabel(/Съгласен съм личните ми данни/).check();
    // Errors are shown in the platform's own dialog (not a native alert()).
    page.on("dialog", (d) => {
      throw new Error(`Неочакван native alert(): ${d.message()}`);
    });
    await page.getByRole("button", { name: "ЗАПИШИ СЕ" }).click();
    await expect(page.getByRole("heading", { name: "Записването не е успешно" })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).toContainText("Този телефон вече е записан");
    await page.getByRole("button", { name: "Добре" }).click();

    const { count } = await client
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("game_id", created.gameId);
    expect(count, "Дублираното записване не трябва да създава ред").toBe(1);
    await context.close();
  });

  await test.step("9. Организаторът вижда играча в списъка", async () => {
    const page = organizer!;
    await page.goto(`/admin/games/${created.gameId}`);
    await settle(page);
    await expect(page.getByRole("heading", { name: "Записани играчи" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).toContainText(`${data.player.first} ${data.player.last}`);
    await expect(page.locator("body")).toContainText(created.registrationCode);
    await expect(page.locator("body")).toContainText("Под наем");
    await page.context().close();
  });
});
