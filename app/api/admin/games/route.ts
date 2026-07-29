import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";
import { closeExpiredGames } from "@/lib/gameVisibility";

export const dynamic = "force-dynamic";

function text(value: unknown, max: number) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/javascript:/gi, "").trim().slice(0, max);
}
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }

async function ownedFieldIds(admin: any, user: { id: string; email?: string | null }, isOwner: boolean) {
  if (isOwner) return null;
  const email = String(user.email || "").toLowerCase();
  const [{ data: fields }, { data: requests }] = await Promise.all([
    admin.from("fields").select("id").or(`owner_user_id.eq.${user.id},owner_email.ilike.${email}`),
    admin.from("field_requests").select("field_id").ilike("email", email).in("status", ["active", "payment_pending", "suspended"]).not("field_id", "is", null),
  ]);
  return Array.from(new Set([
    ...(fields || []).map((row: any) => String(row.id || "")),
    ...(requests || []).map((row: any) => String(row.field_id || "")),
  ].filter(Boolean)));
}

async function canAccessGame(admin: any, gameId: string, fieldIds: string[] | null) {
  const { data: game, error } = await admin.from("games").select("id,field_id").eq("id", gameId).maybeSingle();
  if (error || !game) return false;
  return fieldIds === null || fieldIds.includes(String(game.field_id || ""));
}

export async function GET(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) return NextResponse.json({ ok: false, message: error || "Нямаш активна сесия." }, { status: 401 });
  await closeExpiredGames(admin);

  const fieldIds = await ownedFieldIds(admin, user, Boolean(isOwner));
  const gameId = new URL(request.url).searchParams.get("id") || "";

  if (gameId) {
    if (!(await canAccessGame(admin, gameId, fieldIds))) {
      return NextResponse.json({ ok: false, message: "Нямаш достъп до тази игра." }, { status: 403 });
    }
    const { data: game, error: gameError } = await admin.from("games").select("*").eq("id", gameId).single();
    if (gameError) return NextResponse.json({ ok: false, message: gameError.message }, { status: 500 });
    const { data: players, error: playersError } = await admin.from("registrations").select("*").eq("game_id", gameId).eq("status", "active").order("created_at", { ascending: true });
    if (playersError) return NextResponse.json({ ok: false, message: playersError.message }, { status: 500 });
    const phones = (players || []).map((player: any) => player.phone).filter(Boolean);
    let veteranPhones = new Set<string>();
    if (phones.length) {
      const { data: previous } = await admin.from("registrations").select("phone,game_id").in("phone", phones).neq("game_id", gameId).eq("status", "active");
      veteranPhones = new Set((previous || []).map((item: any) => String(item.phone)));
    }
    return NextResponse.json({ ok: true, game, players: (players || []).map((player: any) => ({ ...player, isVeteran: veteranPhones.has(String(player.phone)) })) });
  }

  if (fieldIds !== null && fieldIds.length === 0) return NextResponse.json({ ok: true, games: [], activity: [] });

  let gamesQuery = admin.from("games").select("*").order("created_at", { ascending: false });
  if (fieldIds !== null) gamesQuery = gamesQuery.in("field_id", fieldIds);
  const { data: games, error: gamesError } = await gamesQuery;
  if (gamesError) return NextResponse.json({ ok: false, message: gamesError.message }, { status: 500 });

  const gameIds = (games || []).map((game: any) => game.id);
  let activity: any[] = [];
  if (gameIds.length) {
    const { data } = await admin.from("registrations")
      .select("id,first_name,last_name,participation_type,created_at,game_id")
      .in("game_id", gameIds).eq("status", "active").order("created_at", { ascending: false }).limit(8);
    activity = data || [];
  }
  return NextResponse.json({ ok: true, games: games || [], activity });
}

export async function POST(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) return NextResponse.json({ ok: false, message: error || "Нямаш активна сесия." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 }); }

  const fieldId = text(body.field_id, 80), title = text(body.title, 120), gameDate = text(body.game_date, 10), gameTime = text(body.game_time, 5), location = text(body.location, 200), rulesText = text(body.rules_text, 3000), description = text(body.description, 1000), status = text(body.status, 20);
  const maxRentalSets = Math.max(0, Math.floor(Number(body.max_rental_sets || 0)));
  if (!fieldId || !title || !gameDate || !gameTime || !location || !rulesText) return NextResponse.json({ ok: false, message: "Попълни всички задължителни полета." }, { status: 400 });
  if (!validDate(gameDate) || !validTime(gameTime)) return NextResponse.json({ ok: false, message: "Датата или часът са невалидни." }, { status: 400 });
  if (!["active", "closed", "postponed"].includes(status)) return NextResponse.json({ ok: false, message: "Невалиден статус на играта." }, { status: 400 });

  const fieldIds = await ownedFieldIds(admin, user, Boolean(isOwner));
  if (fieldIds !== null && !fieldIds.includes(fieldId)) return NextResponse.json({ ok: false, message: "Нямаш достъп до избраното игрище." }, { status: 403 });

  const { data, error: insertError } = await admin.from("games").insert({ title, game_date: gameDate, game_time: gameTime, location, max_rental_sets: maxRentalSets, rules_text: rulesText, status, description, field_id: fieldId }).select("*").single();
  if (insertError) return NextResponse.json({ ok: false, message: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true, game: data });
}

export async function PATCH(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) return NextResponse.json({ ok: false, message: error || "Нямаш активна сесия." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const gameId = text(body.id, 80), status = text(body.status, 20), postponedReason = text(body.postponed_reason, 500);
  const action = text(body.action, 40);
  const fieldIds = await ownedFieldIds(admin, user, Boolean(isOwner));

  if (action === "cancel_registration") {
    const registrationId = text(body.registration_id, 80);
    if (!gameId || !registrationId || !(await canAccessGame(admin, gameId, fieldIds))) return NextResponse.json({ ok: false, message: "Нямаш достъп до тази игра." }, { status: 403 });
    const { error: cancelError } = await admin.from("registrations").update({ status: "cancelled" }).eq("id", registrationId).eq("game_id", gameId);
    if (cancelError) return NextResponse.json({ ok: false, message: cancelError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!gameId || !["active", "closed", "postponed"].includes(status)) return NextResponse.json({ ok: false, message: "Невалидни данни." }, { status: 400 });
  if (!(await canAccessGame(admin, gameId, fieldIds))) return NextResponse.json({ ok: false, message: "Нямаш достъп до тази игра." }, { status: 403 });
  const payload: any = { status };
  if (status === "postponed") payload.postponed_reason = postponedReason || "Играта се отлага поради организационни причини.";
  if (status === "active") payload.postponed_reason = null;
  const { error: updateError } = await admin.from("games").update(payload).eq("id", gameId);
  if (updateError) return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) return NextResponse.json({ ok: false, message: error || "Нямаш активна сесия." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const gameId = text(body.id, 80);
  if (!gameId) return NextResponse.json({ ok: false, message: "Липсва игра." }, { status: 400 });
  const fieldIds = await ownedFieldIds(admin, user, Boolean(isOwner));
  if (!(await canAccessGame(admin, gameId, fieldIds))) return NextResponse.json({ ok: false, message: "Нямаш достъп до тази игра." }, { status: 403 });
  const { error: regError } = await admin.from("registrations").delete().eq("game_id", gameId);
  if (regError) return NextResponse.json({ ok: false, message: regError.message }, { status: 500 });
  const { error: gameError } = await admin.from("games").delete().eq("id", gameId);
  if (gameError) return NextResponse.json({ ok: false, message: gameError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
