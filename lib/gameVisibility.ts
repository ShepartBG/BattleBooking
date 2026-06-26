export type VisibleGame = {
  game_date: string;
  game_time?: string | null;
  status?: string | null;
};

export function getGameStartDateTime(game: VisibleGame) {
  if (!game.game_date) return null;

  const cleanTime = (game.game_time || "23:59").slice(0, 5) || "23:59";
  const date = new Date(`${game.game_date}T${cleanTime}:00`);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isGameStillPublic(game: VisibleGame) {
  if (game.status !== "active" && game.status !== "postponed") return false;

  const gameDateTime = getGameStartDateTime(game);
  if (!gameDateTime) return false;

  return gameDateTime.getTime() >= Date.now();
}
