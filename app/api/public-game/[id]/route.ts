import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_FIELD_SETTINGS } from "@/lib/fieldConfig";
import { loadPublicFieldProfileById } from "@/lib/server/publicFieldProfile";
import { closeExpiredGames } from "@/lib/gameVisibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const gameId = id?.trim();

    if (!gameId) {
      return NextResponse.json({ ok: false, error: "Липсва ID на играта." }, { status: 400 });
    }

    const client = getSupabaseAdmin();
    await closeExpiredGames(client);

    const gameResult = await client
      .from("games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (gameResult.error) {
      return NextResponse.json(
        { ok: false, error: `Грешка при зареждане на играта: ${gameResult.error.message}` },
        { status: 500 },
      );
    }

    const game = gameResult.data;

    if (!game) {
      return NextResponse.json(
        { ok: true, game: null, fieldSettings: DEFAULT_FIELD_SETTINGS, stats: { totalPlayers: 0, rentalPlayers: 0 } },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } },
      );
    }

    const [fieldSettings, registrationsResult] = await Promise.all([
      loadPublicFieldProfileById(client, game.field_id),
      client
        .from("registrations")
        .select("participation_type")
        .eq("game_id", game.id)
        .eq("status", "active"),
    ]);

    const registrations = Array.isArray(registrationsResult.data) ? registrationsResult.data : [];
    const totalPlayers = registrations.length;
    const rentalPlayers = registrations.filter(
      (item: { participation_type?: string | null }) => item.participation_type === "rental",
    ).length;

    return NextResponse.json(
      {
        ok: true,
        game,
        fieldSettings,
        stats: { totalPlayers, rentalPlayers },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
