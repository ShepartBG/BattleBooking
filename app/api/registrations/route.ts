import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit, consumeRateLimit, getClientIp, isValidName, isValidPhone, normalizePhone, sanitizePlainText } from "@/lib/security";
import { isGameStillPublic } from "@/lib/gameVisibility";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await checkRateLimit("registration", ip);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Твърде много опити за записване. Опитай пак след около 10 минути." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Невалидна заявка." }, { status: 400 });

  const gameId = sanitizePlainText(body.game_id, 80);
  const firstName = sanitizePlainText(body.first_name, 40);
  const lastName = sanitizePlainText(body.last_name, 40);
  const phone = normalizePhone(String(body.phone || ""));
  const age = Number(body.age);
  const participationType = sanitizePlainText(body.participation_type, 20);
  const acceptedRules = body.accepted_rules === true;

  if (!gameId) return NextResponse.json({ error: "Липсва игра." }, { status: 400 });
  if (!isValidName(firstName) || !isValidName(lastName)) {
    return NextResponse.json({ error: "Името и фамилията трябва да съдържат само букви." }, { status: 400 });
  }
  if (!isValidPhone(phone)) return NextResponse.json({ error: "Телефонът трябва да бъде точно 10 цифри." }, { status: 400 });
  if (!Number.isInteger(age) || age < 16 || age > 99) {
    return NextResponse.json({ error: "Възрастта трябва да бъде число между 16 и 99." }, { status: 400 });
  }
  if (!['rental', 'own'].includes(participationType)) {
    return NextResponse.json({ error: "Невалиден тип участие." }, { status: 400 });
  }
  if (!acceptedRules) return NextResponse.json({ error: "Трябва да приемеш правилата и условията." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (gameError || !game) return NextResponse.json({ error: "Играта не е намерена." }, { status: 404 });
  if (game.status !== "active" || !isGameStillPublic(game)) {
    return NextResponse.json({ error: "Регистрацията за тази игра е затворена." }, { status: 400 });
  }

  const { data: activeRegistrations, error: statsError } = await supabase
    .from("registrations")
    .select("id, phone, participation_type")
    .eq("game_id", gameId)
    .eq("status", "active");

  if (statsError) return NextResponse.json({ error: "Грешка при проверка на регистрациите." }, { status: 500 });
  if ((activeRegistrations || []).some((item) => item.phone === phone)) {
    return NextResponse.json({ error: "Този телефон вече е записан за тази игра." }, { status: 400 });
  }

  const rentalCount = (activeRegistrations || []).filter((item) => item.participation_type === "rental").length;
  if (participationType === "rental" && rentalCount >= Number(game.max_rental_sets || 0)) {
    return NextResponse.json({ error: "Всички комплекти под наем са резервирани." }, { status: 400 });
  }

  await consumeRateLimit("registration", ip, { game_id: gameId });

  const code = "BB" + Math.floor(1000 + Math.random() * 9000);
  const { error: insertError } = await supabase.from("registrations").insert({
    game_id: gameId,
    first_name: firstName,
    last_name: lastName,
    phone,
    age,
    participation_type: participationType,
    registration_code: code,
    declaration_accepted: true,
    declaration_text: sanitizePlainText(game.rules_text, 3000),
    declaration_accepted_at: new Date().toISOString(),
    rules_version: sanitizePlainText(game.rules_version, 50),
    status: "active",
  });

  if (insertError) return NextResponse.json({ error: "Грешка при записване." }, { status: 500 });
  return NextResponse.json({ code });
}
