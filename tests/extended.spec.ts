import { test, expect, type Browser, type BrowserContext, type Page, type APIRequestContext } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import zlib from "node:zlib";
import { acceptCookies, settle } from "./helpers";

/**
 * Extended coverage for everything the lifecycle test does not touch:
 * auth edge cases, image uploads (settings, field, gallery), game edit /
 * postpone / close / expiry, cancelling players, full rental kits, calendar &
 * stats, subscription renew / suspend / expiry, owner shops & events, emails.
 *
 * A throw-away organizer is created through the real APIs (public request +
 * owner approval) and every row, storage object and auth user is removed in
 * afterAll. Other profiles are never touched.
 */

const baseHost = new URL(process.env.TEST_BASE_URL || "http://127.0.0.1:3000").hostname;
const isLocal = baseHost === "localhost" || baseHost === "127.0.0.1";
const allowMutations = isLocal || process.env.TEST_ALLOW_MUTATIONS === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BUCKET = "battlebooking-media";

const stamp = String(Date.now()).slice(-7);
const ipBase = `10.88.${Number(stamp.slice(-3)) % 250}`;

const data = {
  fieldName: `E2X Игрище ${stamp}`,
  secondField: `E2X Терен Две ${stamp}`,
  ownerName: "Тест Разширен",
  city: "Тестово",
  phone: `086${stamp}`,
  email: `delivered+bb-e2x-${stamp}@resend.dev`,
  password: `E2x-${Date.now().toString(36)}-Pass!`,
  slug: `e2x-${stamp}`,
  gameTitle: `E2X Игра ${stamp}`,
  gameTitleEdited: `E2X Игра Редактирана ${stamp}`,
  shopName: `E2X Магазин ${stamp}`,
  eventName: `E2X Събитие ${stamp}`,
  ips: { login: `${ipBase}.11`, reset: `${ipBase}.12`, player1: `${ipBase}.13`, player2: `${ipBase}.14`, api: `${ipBase}.15` },
};

const created = { requestId: "", fieldId: "", secondFieldId: "", gameId: "", userId: "" };

// ---------- helpers ----------

function admin(): SupabaseClient {
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Minimal valid RGB PNG, so the browser can decode/compress it like a real photo. */
function makePng(size: number, rgb: [number, number, number]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type), body]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(typed));
    return Buffer.concat([len, typed, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => rgb[i % 3])]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const png = (name: string, rgb: [number, number, number]) => ({ name, mimeType: "image/png", buffer: makePng(96, rgb) });

function futureDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return { ui: `${dd}.${mm}.${d.getFullYear()}`, iso: `${d.getFullYear()}-${mm}-${dd}`, sameMonth: d.getMonth() === new Date().getMonth() };
}

function ownerToken() {
  const state = JSON.parse(fs.readFileSync("playwright/.auth/owner.json", "utf8"));
  for (const origin of state.origins || []) {
    for (const item of origin.localStorage || []) {
      if (/^sb-.*-auth-token$/.test(item.name)) {
        const parsed = JSON.parse(item.value);
        return String(parsed?.access_token || parsed?.currentSession?.access_token || "");
      }
    }
  }
  return "";
}

async function organizerToken() {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: session, error } = await client.auth.signInWithPassword({ email: data.email, password: data.password });
  if (error) throw error;
  return session.session!.access_token;
}

async function checkAccess(request: APIRequestContext) {
  const token = await organizerToken();
  const response = await request.get("/api/auth/check-access", { headers: { Authorization: `Bearer ${token}` } });
  return response.json();
}

async function findAuthUserId(client: SupabaseClient, email: string) {
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    const { data: list, error } = await client.auth.admin.listUsers({ page: pageNo, perPage: 1000 });
    if (error) throw error;
    const users = list.users as Array<{ id: string; email?: string }>;
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 1000) return "";
  }
  return "";
}

async function newPage(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext({ reducedMotion: "reduce", ...options });
  const page = await context.newPage();
  return { context, page };
}

async function loginOrganizer(page: Page) {
  await page.goto("/login");
  await settle(page);
  await page.locator('input[type="email"]').fill(data.email);
  await page.locator('input[type="password"]').fill(data.password);
  await page.getByRole("button", { name: /^вход$/i }).click();
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Нова игра" }).first()).toBeVisible({ timeout: 30_000 });
}

/** Confirms the platform's own dialogs (bbConfirm -> "Потвърждавам", feedback.confirmAction -> "ПОТВЪРДИ"). */
async function confirmDialog(page: Page) {
  await page.getByRole("button", { name: /^(Потвърждавам|ПОТВЪРДИ)$/ }).click();
}

async function removeStorageFolder(client: SupabaseClient, prefix: string) {
  const files: string[] = [];
  async function walk(path: string) {
    const { data: entries } = await client.storage.from(BUCKET).list(path, { limit: 1000 });
    for (const entry of entries || []) {
      const full = `${path}/${entry.name}`;
      if (entry.id) files.push(full);
      else await walk(full);
    }
  }
  await walk(prefix);
  if (files.length) await client.storage.from(BUCKET).remove(files);
}

function storagePath(url: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : "";
}

// ---------- setup / cleanup ----------

test.describe.configure({ mode: "serial" });

let organizerContext: BrowserContext;
let org: Page;

test.beforeAll(async ({ request }) => {
  if (!allowMutations) throw new Error("Разширеният тест създава данни. Извън localhost сложи TEST_ALLOW_MUTATIONS=1.");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Липсват Supabase ключове. Пусни с: npm run test:browser:extended");
  }
  const client = admin();

  // Real public request API
  const create = await request.post("/api/field-requests", {
    data: {
      action: "create",
      field_name: data.fieldName,
      owner_name: data.ownerName,
      email: data.email,
      phone: data.phone,
      city: data.city,
      message: "Разширен E2E тест. Ще бъде изтрит.",
    },
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  const { data: row } = await client.from("field_requests").select("id").eq("email", data.email).single();
  created.requestId = row!.id;

  // Real owner approval API (creates auth user + field + sends email through Resend)
  const approve = await request.post("/api/admin/field-request-status", {
    headers: { Authorization: `Bearer ${ownerToken()}` },
    data: { requestId: created.requestId, status: "active" },
  });
  const approveJson = await approve.json();
  expect(approveJson.ok, approveJson.message).toBe(true);
  // Email engine actually delivered (Resend accepted the message)
  expect(approveJson.message).toContain("email е изпратен");

  const { data: approved } = await client
    .from("field_requests")
    .select("field_id,decision_message")
    .eq("id", created.requestId)
    .single();
  created.fieldId = approved!.field_id;
  // The approval email contains a working password link
  expect(approved!.decision_message).toMatch(/https?:\/\/\S+/);

  created.userId = await findAuthUserId(client, data.email);
  const { error: pwError } = await client.auth.admin.updateUserById(created.userId, { password: data.password });
  expect(pwError).toBeNull();
});

test.afterAll(async () => {
  if (!supabaseUrl || !serviceKey) return;
  await organizerContext?.close().catch(() => undefined);
  const client = admin();
  const problems: string[] = [];
  const note = (label: string, error: { message: string } | null | undefined) => {
    if (error) problems.push(`${label}: ${error.message}`);
  };

  const fieldIds = [created.fieldId, created.secondFieldId].filter(Boolean);
  const { data: extraFields } = await client.from("fields").select("id").ilike("field_name", `E2X % ${stamp}`);
  extraFields?.forEach((f) => fieldIds.includes(f.id) || fieldIds.push(f.id));

  if (fieldIds.length) {
    const { data: games } = await client.from("games").select("id").in("field_id", fieldIds);
    const gameIds = (games || []).map((g) => g.id);
    if (gameIds.length) {
      note("registrations", (await client.from("registrations").delete().in("game_id", gameIds)).error);
      note("games", (await client.from("games").delete().in("id", gameIds)).error);
    }
    note("field_images", (await client.from("field_images").delete().in("field_id", fieldIds)).error);
    for (const id of fieldIds) await removeStorageFolder(client, `fields/${id}`).catch((e) => problems.push(`storage ${id}: ${e}`));
  }

  note("field_requests", (await client.from("field_requests").delete().eq("email", data.email)).error);
  if (fieldIds.length) note("fields", (await client.from("fields").delete().in("id", fieldIds)).error);

  for (const [table, column, value, images] of [
    ["partner_shops", "name", data.shopName, ["logo_url", "cover_url"]],
    ["special_events", "title", data.eventName, ["cover_url"]],
  ] as const) {
    const { data: rows } = await client.from(table).select("*").eq(column, value);
    const paths = (rows || []).flatMap((r: any) => images.map((k) => storagePath(String(r[k] || "")))).filter(Boolean);
    if (paths.length) await client.storage.from(BUCKET).remove(paths);
    if (rows?.length) note(table, (await client.from(table).delete().eq(column, value)).error);
  }

  note("rate_limit_events", (await client.from("rate_limit_events").delete().like("identifier", `${ipBase}.%`)).error);

  const userId = created.userId || (await findAuthUserId(client, data.email).catch(() => ""));
  if (userId) note("auth user", (await client.auth.admin.deleteUser(userId)).error);

  if (problems.length) console.warn(`⚠️ Cleanup не изтри всичко:\n${problems.join("\n")}`);
});

// ---------- the suite ----------

test("разширено покритие на платформата", async ({ browser, request }) => {
  test.setTimeout(480_000);
  const client = admin();
  const gameDay = futureDate(4);

  await test.step("Вход: грешна парола се отказва", async () => {
    const { context, page } = await newPage(browser, { extraHTTPHeaders: { "x-forwarded-for": data.ips.login } });
    await page.goto("/login");
    await settle(page);
    await page.locator('input[type="email"]').fill(data.email);
    await page.locator('input[type="password"]').fill("wrong-password-123");
    await page.getByRole("button", { name: /^вход$/i }).click();
    await expect(page.locator("body")).toContainText(/грешен имейл|грешна парола|невалиден/i, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  await test.step("Забравена парола изпраща линк", async () => {
    const { context, page } = await newPage(browser, { extraHTTPHeaders: { "x-forwarded-for": data.ips.reset } });
    await page.goto("/forgot-password");
    await settle(page);
    await page.getByPlaceholder("organizer@email.com").fill(data.email);
    await page.getByRole("button", { name: "Изпрати линк" }).click();
    await expect(page.locator("body")).toContainText("Изпратихме линк за смяна на парола", { timeout: 30_000 });
    await context.close();
  });

  await test.step("Вход като организатор", async () => {
    ({ context: organizerContext, page: org } = await newPage(browser));
    await loginOrganizer(org);
  });

  await test.step("Настройки: качване на лого и фон", async () => {
    await org.goto("/admin/settings");
    await settle(org);
    await expect(org.getByRole("heading", { name: "Настройки на игрището" })).toBeVisible({ timeout: 30_000 });
    await org.getByLabel("Кратко име на игрището (URL slug)").fill(data.slug);
    const files = org.locator('input[type="file"]');
    await files.nth(0).setInputFiles(png("logo.png", [149, 201, 0]));
    await files.nth(1).setInputFiles(png("bg.png", [30, 60, 20]));
    await org.getByRole("button", { name: "Запази настройките" }).click();
    await expect(org.locator("body")).toContainText("Запазено успешно", { timeout: 30_000 });

    const { data: row } = await client.from("field_requests").select("logo_url,background_url,public_slug").eq("id", created.requestId).single();
    expect(row?.public_slug).toBe(data.slug);
    expect(String(row?.logo_url || "")).not.toBe("");
    expect(String(row?.background_url || "")).not.toBe("");
  });

  await test.step("Игрища: лого/фон в storage, второ игрище добавено и изтрито", async () => {
    await org.goto("/admin/fields");
    await settle(org);
    await org.getByRole("button", { name: new RegExp(data.fieldName) }).click({ timeout: 30_000 });
    await org.getByLabel("Точна локация", { exact: true }).fill(`${data.city}, област Тестова`);
    const files = org.locator('input[type="file"]');
    await files.nth(0).setInputFiles(png("field-logo.png", [200, 200, 40]));
    await files.nth(1).setInputFiles(png("field-bg.png", [10, 40, 10]));
    await org.getByRole("button", { name: "ЗАПАЗИ ИГРИЩЕТО" }).click();
    await expect(org.locator("body")).toContainText("Игрището е запазено успешно", { timeout: 40_000 });

    const { data: field } = await client.from("fields").select("logo_url,background_url").eq("id", created.fieldId).single();
    expect(field?.logo_url).toContain(`/${BUCKET}/fields/${created.fieldId}/profile/`);
    expect(field?.background_url).toContain(`/${BUCKET}/fields/${created.fieldId}/profile/`);
    const logoResponse = await request.get(field!.logo_url);
    expect(logoResponse.status(), "Каченото лого не се отваря публично").toBe(200);

    // second field
    await org.getByRole("button", { name: "+ Добави ново игрище" }).click();
    await org.getByLabel("Име", { exact: true }).fill(data.secondField);
    await org.getByLabel("Населено място", { exact: true }).fill(data.city);
    await org.getByRole("button", { name: "ДОБАВИ ИГРИЩЕ" }).click();
    await expect(org.getByRole("button", { name: new RegExp(data.secondField) })).toBeVisible({ timeout: 30_000 });
    const { data: second } = await client.from("fields").select("id").eq("field_name", data.secondField).single();
    created.secondFieldId = second!.id;

    const card = org.locator("div.rounded-2xl").filter({ has: org.getByRole("button", { name: new RegExp(data.secondField) }) });
    await card.getByRole("button", { name: "ИЗТРИЙ ИГРИЩЕТО" }).click();
    await confirmDialog(org);
    await expect(org.getByRole("button", { name: new RegExp(data.secondField) })).toHaveCount(0, { timeout: 30_000 });
    const { count } = await client.from("fields").select("id", { count: "exact", head: true }).eq("id", created.secondFieldId);
    expect(count).toBe(0);
  });

  await test.step("Галерия: качване на 2 снимки и изтриване на 1", async () => {
    await org.goto("/admin/gallery");
    await settle(org);
    await expect(org.getByRole("heading", { name: "Галерия" })).toBeVisible({ timeout: 30_000 });
    await expect(org.getByText("Избери снимки (0/10)")).toBeVisible({ timeout: 30_000 });
    await org.locator('input[type="file"]').setInputFiles([png("g1.png", [120, 20, 20]), png("g2.png", [20, 20, 120])]);
    await org.getByRole("button", { name: /Качи избраните \(2\)/ }).click();
    await expect(org.locator("body")).toContainText("2 снимки са качени успешно", { timeout: 60_000 });
    await expect(org.getByAltText("Снимка от игрището")).toHaveCount(2);

    await org.getByRole("button", { name: "Изтрий" }).first().click();
    await confirmDialog(org);
    await expect(org.getByAltText("Снимка от игрището")).toHaveCount(1, { timeout: 30_000 });
    const { count } = await client.from("field_images").select("id", { count: "exact", head: true }).eq("field_id", created.fieldId);
    expect(count).toBe(1);
  });

  await test.step("Нова игра с 1 комплект под наем", async () => {
    await org.goto("/admin/new-game");
    await settle(org);
    const fieldSelect = org.locator("select").filter({ has: org.locator("option", { hasText: "Избери игрище" }) });
    await expect(fieldSelect).toHaveValue(created.fieldId, { timeout: 30_000 });
    const title = org.getByPlaceholder("Напр. Неделна игра");
    await title.fill(data.gameTitle);
    const dateInput = org.locator(".react-datepicker-wrapper input");
    await dateInput.fill(gameDay.ui);
    await dateInput.press("Escape");
    await org.getByLabel("Комплекти под наем").fill("1");
    await expect(title).toHaveValue(data.gameTitle);
    await org.getByRole("button", { name: "СЪЗДАЙ ИГРА" }).click();
    await expect(org.locator("body")).toContainText("Играта е създадена успешно", { timeout: 20_000 });
    await org.getByRole("button", { name: "Добре" }).click();
    const { data: game } = await client.from("games").select("id").eq("title", data.gameTitle).single();
    created.gameId = game!.id;
  });

  await test.step("Публична страница на игрището показва игра и галерия", async () => {
    const { context, page } = await newPage(browser);
    await page.goto(`/field/${data.slug}`);
    await settle(page);
    await expect(page.locator("body")).toContainText(data.gameTitle, { timeout: 30_000 });
    // Gallery images go through the image optimizer (/_next/image?url=<encoded storage URL>)
    const galleryImg = page.locator(`img[src*="${encodeURIComponent(`/fields/${created.fieldId}/gallery/`)}"]`).first();
    await expect(galleryImg).toBeVisible();
    await expect.poll(() => galleryImg.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await context.close();
  });

  await test.step("Пълни комплекти: след 1 наем опцията изчезва", async () => {
    const p1 = await newPage(browser, { extraHTTPHeaders: { "x-forwarded-for": data.ips.player1 } });
    await registerPlayer(p1.page, { first: "Първи", last: "Наемател", phone: `0881${stamp.slice(-6)}`, type: "rental" });
    await expect(p1.page.locator("body")).toContainText("Успешна регистрация!", { timeout: 20_000 });
    await p1.context.close();

    const p2 = await newPage(browser, { extraHTTPHeaders: { "x-forwarded-for": data.ips.player2 } });
    await p2.page.goto(`/game/${created.gameId}`);
    await settle(p2.page);
    await expect(p2.page.locator('select[name="participation_type"] option[value="rental"]')).toHaveCount(0);
    await expect(p2.page.locator("body")).toContainText("Всички комплекти са заети");
    await expect(p2.page.getByRole("meter").first()).toHaveAttribute("aria-valuenow", "0");
    // the API refuses a rental too
    const refused = await p2.page.request.post("/api/registrations", {
      headers: { "x-forwarded-for": data.ips.api },
      data: { game_id: created.gameId, first_name: "Втори", last_name: "Наемател", phone: `0882${stamp.slice(-6)}`, age: 20, participation_type: "rental", accepted_rules: true },
    });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).error).toContain("Всички комплекти под наем са резервирани");
    await p2.context.close();
  });

  await test.step("Анулиране на играч освобождава комплекта", async () => {
    await org.goto(`/admin/games/${created.gameId}`);
    await settle(org);
    await expect(org.locator("body")).toContainText("Първи Наемател", { timeout: 30_000 });
    await org.getByRole("button", { name: "Анулирай" }).click();
    await confirmDialog(org);
    await expect(org.locator("body")).not.toContainText("Първи Наемател", { timeout: 30_000 });
    const pub = await (await request.get(`/api/public-game/${created.gameId}?refresh=${Date.now()}`)).json();
    expect(pub.stats.rentalPlayers).toBe(0);
  });

  await test.step("Редакция на игра", async () => {
    await org.goto(`/admin/games/${created.gameId}/edit`);
    await settle(org);
    const titleInput = org.getByLabel("Заглавие", { exact: true });
    await expect(titleInput).toHaveValue(data.gameTitle, { timeout: 30_000 });
    await titleInput.fill(data.gameTitleEdited);
    await org.getByLabel("Комплекти под наем").fill("3");
    await org.locator('button:not([type="button"])').filter({ hasText: /запази|обнови/i }).first().click();
    await expect(org.locator("body")).toContainText("Играта е обновена успешно", { timeout: 20_000 });
    await org.getByRole("button", { name: "Добре" }).click().catch(() => undefined);
    const { data: game } = await client.from("games").select("title,max_rental_sets").eq("id", created.gameId).single();
    expect(game).toMatchObject({ title: data.gameTitleEdited, max_rental_sets: 3 });
  });

  await test.step("Отлагане → публично съобщение; активиране; затваряне", async () => {
    await org.goto("/admin");
    await settle(org);
    const card = org.locator("article").filter({ hasText: data.gameTitleEdited });
    await expect(card).toBeVisible({ timeout: 30_000 });

    await card.getByRole("button", { name: "Отложи" }).click();
    await org.locator("textarea").last().fill("Лошо време — E2E тест");
    await confirmDialog(org);
    await expect.poll(async () => (await client.from("games").select("status").eq("id", created.gameId).single()).data?.status).toBe("postponed");

    const { context, page } = await newPage(browser);
    await page.goto(`/game/${created.gameId}`);
    await settle(page);
    await expect(page.locator("body")).toContainText("ИГРАТА СЕ ОТЛАГА", { timeout: 30_000 });
    await expect(page.locator("body")).toContainText("Лошо време — E2E тест");
    await page.goto("/games");
    await expect(page.locator("article").filter({ hasText: data.gameTitleEdited })).toContainText("ОТЛОЖЕНА");
    await context.close();

    await card.getByRole("button", { name: "Активирай" }).click();
    await confirmDialog(org);
    await expect.poll(async () => (await client.from("games").select("status").eq("id", created.gameId).single()).data?.status).toBe("active");

    await card.getByRole("button", { name: "Затвори" }).click();
    await confirmDialog(org);
    await expect.poll(async () => (await client.from("games").select("status").eq("id", created.gameId).single()).data?.status).toBe("closed");
    const closed = await request.post("/api/registrations", {
      headers: { "x-forwarded-for": data.ips.api },
      data: { game_id: created.gameId, first_name: "Късен", last_name: "Играч", phone: `0883${stamp.slice(-6)}`, age: 20, participation_type: "own", accepted_rules: true },
    });
    expect(closed.status()).toBe(400);
    expect((await closed.json()).error).toContain("затворена");

    await card.getByRole("button", { name: "Активирай" }).click();
    await confirmDialog(org);
    await expect.poll(async () => (await client.from("games").select("status").eq("id", created.gameId).single()).data?.status).toBe("active");
  });

  await test.step("Изтекла игра изчезва от публичния списък и не приема записи", async () => {
    const past = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
    await client.from("games").update({ game_date: past }).eq("id", created.gameId);
    const list = await (await request.get("/api/public-games")).json();
    expect((list.games || []).some((g: any) => g.id === created.gameId)).toBe(false);
    const late = await request.post("/api/registrations", {
      headers: { "x-forwarded-for": data.ips.api },
      data: { game_id: created.gameId, first_name: "Закъснял", last_name: "Играч", phone: `0884${stamp.slice(-6)}`, age: 20, participation_type: "own", accepted_rules: true },
    });
    expect(late.status()).toBe(400);
    await client.from("games").update({ game_date: gameDay.iso, status: "active" }).eq("id", created.gameId);
    const back = await (await request.get("/api/public-games")).json();
    expect((back.games || []).some((g: any) => g.id === created.gameId)).toBe(true);
  });

  await test.step("Календар и статистика", async () => {
    await org.goto("/admin/calendar");
    await settle(org);
    if (gameDay.sameMonth) {
      await expect(org.locator("body")).toContainText(data.gameTitleEdited, { timeout: 30_000 });
    } else {
      await expect(org.locator("body")).not.toContainText(/Application error|Грешка при зареждане/);
    }
    await org.goto("/admin/stats");
    await settle(org);
    await expect(org.locator("body")).toContainText(/Статистика/i, { timeout: 30_000 });
    await expect(org.locator("body")).not.toContainText(/Application error|Грешка при зареждане/);
  });

  await test.step("Абонамент: подновяване +30 дни (owner UI)", async () => {
    const before = (await client.from("field_requests").select("subscription_valid_until").eq("id", created.requestId).single()).data!
      .subscription_valid_until as string;
    const { context, page } = await newPage(browser, { storageState: "playwright/.auth/owner.json" });
    await page.goto("/admin/requests");
    await settle(page);
    const card = page.locator("article").filter({ hasText: data.email });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: /Поднови \+30 дни/ }).click();
    await confirmDialog(page);
    await expect.poll(async () =>
      (await client.from("field_requests").select("subscription_valid_until").eq("id", created.requestId).single()).data?.subscription_valid_until,
    { timeout: 30_000 }).not.toBe(before);
    const after = (await client.from("field_requests").select("subscription_valid_until").eq("id", created.requestId).single()).data!
      .subscription_valid_until as string;
    const diffDays = Math.round((Date.parse(after) - Date.parse(before)) / 864e5);
    expect(diffDays).toBe(30);

    // Suspend -> organizer is blocked
    await card.getByRole("button", { name: "Suspend" }).click();
    await confirmDialog(page);
    await expect(card).toContainText("Спрян", { timeout: 30_000 });
    const suspended = await checkAccess(request);
    expect(suspended.allowed).toBe(false);
    expect(suspended.message).toContain("ограничен");
    // Server-side too: a suspended organizer cannot use admin APIs with a valid token
    const blockedApi = await request.get("/api/admin/games", { headers: { Authorization: `Bearer ${await organizerToken()}` } });
    expect([401, 403]).toContain(blockedApi.status());

    // Re-approve -> allowed again
    await card.getByRole("button", { name: "Approve" }).click();
    await confirmDialog(page);
    await expect(card).toContainText("Активен", { timeout: 30_000 });
    expect((await checkAccess(request)).allowed).toBe(true);
    await context.close();
  });

  await test.step("Изтекъл абонамент блокира достъпа до админ панела", async () => {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const { data: saved } = await client.from("field_requests").select("subscription_valid_until,grace_until").eq("id", created.requestId).single();
    await client.from("field_requests").update({ subscription_valid_until: yesterday, grace_until: yesterday }).eq("id", created.requestId);

    expect((await checkAccess(request)).allowed).toBe(false);
    const expiredApi = await request.post("/api/admin/games", {
      headers: { Authorization: `Bearer ${await organizerToken()}` },
      data: { title: "Не трябва да се създаде", game_date: gameDay.iso, game_time: "11:00", location: "x", max_rental_sets: 0, rules_text: "x", status: "active", field_id: created.fieldId },
    });
    expect([401, 403]).toContain(expiredApi.status());
    const { context, page } = await newPage(browser);
    await page.goto("/login");
    await settle(page);
    await page.locator('input[type="email"]').fill(data.email);
    await page.locator('input[type="password"]').fill(data.password);
    await page.getByRole("button", { name: /^вход$/i }).click();
    await expect(page.getByRole("link", { name: "Нова игра" })).toHaveCount(0);
    await expect(page.locator("body")).toContainText(/ограничен|Вход/i, { timeout: 30_000 });
    await context.close();

    await client.from("field_requests").update(saved!).eq("id", created.requestId);
    expect((await checkAccess(request)).allowed).toBe(true);
  });

  await test.step("Owner: магазин и събитие с качване на снимка, публично видими, после изтрити", async () => {
    const { context, page } = await newPage(browser, { storageState: "playwright/.auth/owner.json" });

    await page.goto("/admin/shops");
    await settle(page);
    await page.getByLabel("Име", { exact: true }).fill(data.shopName);
    await page.getByLabel("Сайт", { exact: true }).fill("https://example.com");
    await page.locator('input[type="file"]').nth(0).setInputFiles(png("shop-logo.png", [240, 180, 0]));
    await expect(page.locator(`img[src*="/${BUCKET}/shops/"]`).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "ДОБАВИ МАГАЗИН" }).click();
    await expect(page.locator("body")).toContainText("Магазинът е добавен успешно", { timeout: 30_000 });
    expect(JSON.stringify(await (await request.get("/api/public-shops")).json())).toContain(data.shopName);

    const shopId = (await client.from("partner_shops").select("id").eq("name", data.shopName).single()).data!.id;
    const otherShops = await otherIds(client, "partner_shops", shopId);
    await guardDeletes(page, "**/api/admin/shops", shopId);
    await expect(adminListRow(page, data.shopName)).toHaveCount(1);
    await adminListRow(page, data.shopName).getByRole("button", { name: "Изтрий" }).click();
    await confirmDialog(page);
    await expect(page.locator("body")).toContainText("Магазинът е изтрит", { timeout: 30_000 });
    expect(JSON.stringify(await (await request.get("/api/public-shops")).json())).not.toContain(data.shopName);
    expect(await otherIds(client, "partner_shops", shopId), "Тестът засегна чужд магазин!").toEqual(otherShops);

    await page.goto("/admin/events");
    await settle(page);
    await page.getByLabel("Име", { exact: true }).fill(data.eventName);
    await page.getByLabel("Начална дата").fill(futureDate(30).iso);
    await page.getByLabel("Град", { exact: true }).fill(data.city);
    await page.locator('input[type="file"]').first().setInputFiles(png("event-cover.png", [0, 120, 200]));
    await expect(page.locator(`img[src*="/${BUCKET}/events/"]`).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "ДОБАВИ СЪБИТИЕ" }).click();
    await expect(page.locator("body")).toContainText("Събитието е добавено успешно", { timeout: 30_000 });
    expect(JSON.stringify(await (await request.get("/api/public-events")).json())).toContain(data.eventName);

    const eventId = (await client.from("special_events").select("id").eq("title", data.eventName).single()).data!.id;
    const otherEvents = await otherIds(client, "special_events", eventId);
    await guardDeletes(page, "**/api/admin/events", eventId);
    await expect(adminListRow(page, data.eventName)).toHaveCount(1);
    await adminListRow(page, data.eventName).getByRole("button", { name: "Изтрий" }).click();
    await confirmDialog(page);
    await expect(page.locator("body")).toContainText("Събитието е изтрито", { timeout: 30_000 });
    expect(JSON.stringify(await (await request.get("/api/public-events")).json())).not.toContain(data.eventName);
    expect(await otherIds(client, "special_events", eventId), "Тестът засегна чуждо събитие!").toEqual(otherEvents);
    await context.close();
  });
});

/** Exactly one owner-list row whose bold title equals `name` (never a parent container). */
function adminListRow(page: Page, name: string) {
  const row = page
    .locator("div.flex.items-center.justify-between")
    .filter({ has: page.locator("b", { hasText: new RegExp(`^${name}$`) }) });
  return row;
}

/** Hard safety net: abort any DELETE whose body targets anything but the test record. */
async function guardDeletes(page: Page, url: string, allowedId: string) {
  await page.route(url, async (route) => {
    const req = route.request();
    if (req.method() !== "DELETE") return route.continue();
    const body = JSON.parse(req.postData() || "{}");
    if (String(body.id) !== allowedId) {
      await route.abort();
      throw new Error(`Блокирано изтриване на чужд запис (${body.id}); позволено е само ${allowedId}`);
    }
    return route.continue();
  });
}

async function otherIds(client: SupabaseClient, table: string, exceptId: string) {
  const { data: rows } = await client.from(table).select("id").neq("id", exceptId).order("id");
  return (rows || []).map((r: any) => r.id as string);
}

async function registerPlayer(page: Page, p: { first: string; last: string; phone: string; type: "rental" | "own" }) {
  await page.goto(`/game/${created.gameId}`);
  await settle(page);
  await acceptCookies(page);
  await page.getByPlaceholder("Име / First name").fill(p.first);
  await page.getByPlaceholder("Фамилия / Last name").fill(p.last);
  await page.getByPlaceholder("Телефон / Phone").fill(p.phone);
  await page.getByPlaceholder("Възраст / Age").fill("22");
  await page.locator('select[name="participation_type"]').selectOption(p.type);
  await page.getByRole("button", { name: "ПРОЧЕТИ ИНСТРУКТАЖА" }).click();
  await page.getByRole("button", { name: "Разбрах и продължавам" }).click();
  await page.getByLabel(/Прочетох и приемам инструктажа/).check();
  await page.getByLabel(/Съгласен съм личните ми данни/).check();
  await page.getByRole("button", { name: "ЗАПИШИ СЕ" }).click();
}
