import { GET as getPublicGamesRoute } from "@/app/api/public-games/route";
import { GET as getPublicFieldsRoute } from "@/app/api/public-fields/route";

/**
 * Server-side data for public pages. Calls the same handlers that serve
 * /api/public-games and /api/public-fields, so server-rendered pages and the
 * JSON API always share one implementation.
 */

export async function loadPublicGames<T = unknown>(): Promise<T[]> {
  try {
    const response = await getPublicGamesRoute();
    const result = await response.json().catch(() => null);
    return result?.ok && Array.isArray(result.games) ? (result.games as T[]) : [];
  } catch (error) {
    console.error("loadPublicGames failed", error);
    return [];
  }
}

export async function loadPublicFields<T = unknown>(): Promise<T[]> {
  try {
    const response = await getPublicFieldsRoute(new Request("http://internal/api/public-fields"));
    const result = await response.json().catch(() => null);
    return Array.isArray(result?.fields) ? (result.fields as T[]) : [];
  } catch (error) {
    console.error("loadPublicFields failed", error);
    return [];
  }
}
