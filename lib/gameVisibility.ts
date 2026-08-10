export type VisibleGame = {
  game_date: string;
  game_time?: string | null;
  status?: string | null;
};

export const PUBLIC_GAME_HOLD_HOURS = 4;
const SOFIA_TIME_ZONE = "Europe/Sofia";

type SofiaParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getSofiaParts(date = new Date()): SofiaParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SOFIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function sofiaWallClockMs(date = new Date()) {
  const p = getSofiaParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

export function getPublicGamesMinDate(now = new Date()) {
  const p = getSofiaParts(now);
  const wallClock = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
  wallClock.setUTCHours(wallClock.getUTCHours() - PUBLIC_GAME_HOLD_HOURS);
  return formatDateParts(wallClock.getUTCFullYear(), wallClock.getUTCMonth() + 1, wallClock.getUTCDate());
}

export function getGameStartDateTime(game: VisibleGame) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(game.game_date || ""))) return null;

  const cleanTime = String(game.game_time || "23:59").slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleanTime)) return null;

  const [year, month, day] = game.game_date.split("-").map(Number);
  const [hour, minute] = cleanTime.split(":").map(Number);
  const pseudoLocal = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  return Number.isNaN(pseudoLocal.getTime()) ? null : pseudoLocal;
}

export function isGameStillPublic(game: VisibleGame, now = new Date()) {
  if (game.status !== "active" && game.status !== "postponed") return false;

  const gameDateTime = getGameStartDateTime(game);
  if (!gameDateTime) return false;

  const visibleUntil = gameDateTime.getTime() + PUBLIC_GAME_HOLD_HOURS * 60 * 60 * 1000;
  return visibleUntil >= sofiaWallClockMs(now);
}

export async function closeExpiredGames(admin: any) {
  // If the SQL helper from v1.14 is installed, let Postgres close everything
  // atomically using Europe/Sofia time. Keep the JS fallback for installations
  // that have not run the migration yet.
  try {
    const rpc = await admin.rpc("bb_close_expired_games");
    if (!rpc?.error) {
      const value = Array.isArray(rpc?.data) ? rpc.data[0]?.closed_count : rpc?.data;
      return { closed: Number(value || 0), error: null };
    }
  } catch {
    // Fall through to the safe JS implementation.
  }

  const p = getSofiaParts(new Date());
  const today = formatDateParts(p.year, p.month, p.day);

  const { data, error } = await admin
    .from("games")
    .select("id,game_date,game_time,status")
    .in("status", ["active", "postponed"])
    .lte("game_date", today);

  if (error || !Array.isArray(data) || data.length === 0) {
    return { closed: 0, error: error?.message || null };
  }

  const expiredIds = data
    .filter((game: VisibleGame & { id?: string | null }) => !isGameStillPublic(game))
    .map((game: { id?: string | null }) => String(game.id || ""))
    .filter(Boolean);

  if (expiredIds.length === 0) return { closed: 0, error: null };

  const { error: updateError } = await admin
    .from("games")
    .update({ status: "closed" })
    .in("id", expiredIds)
    .in("status", ["active", "postponed"]);

  return {
    closed: updateError ? 0 : expiredIds.length,
    error: updateError?.message || null,
  };
}
