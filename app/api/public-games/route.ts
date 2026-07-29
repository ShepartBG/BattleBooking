import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { closeExpiredGames, getPublicGamesMinDate, isGameStillPublic } from "@/lib/gameVisibility";
import { loadPublicFieldProfilesByIds } from "@/lib/server/publicFieldProfile";

export const revalidate = 15;

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    await closeExpiredGames(admin);

    const { data, error } = await admin
      .from("games")
      .select(
        "id,title,game_date,game_time,location,max_rental_sets,status,description,field_id",
      )
      .in("status", ["active", "postponed"])
      .gte("game_date", getPublicGamesMinDate())
      .order("game_date", { ascending: true })
      .order("game_time", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const games = (data || []).filter(isGameStillPublic);
    const gameIds = games.map((game: any) => String(game.id)).filter(Boolean);

    const [fieldProfiles, registrationsResult] = await Promise.all([
      loadPublicFieldProfilesByIds(
        admin,
        games.map((game: any) => game.field_id),
      ),
      gameIds.length
        ? admin
            .from("registrations")
            .select("game_id")
            .in("game_id", gameIds)
            .eq("status", "active")
        : Promise.resolve({ data: [], error: null }),
    ]);

    const registeredCountByGame = new Map<string, number>();
    if (!registrationsResult.error && Array.isArray(registrationsResult.data)) {
      for (const registration of registrationsResult.data as any[]) {
        const gameId = String(registration.game_id || "");
        if (!gameId) continue;
        registeredCountByGame.set(gameId, (registeredCountByGame.get(gameId) || 0) + 1);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        games: games.map((game: any) => ({
          ...game,
          registered_count: registeredCountByGame.get(String(game.id)) || 0,
          fieldSettings: game.field_id ? fieldProfiles[String(game.field_id)] : undefined,
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Грешка при зареждане на игрите.",
      },
      { status: 500 },
    );
  }
}
