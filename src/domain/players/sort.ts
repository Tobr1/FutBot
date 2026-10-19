/**
 * Orden del plantel (puro, sin IO). Los criterios numéricos van de mayor a
 * menor y los empates se resuelven por apodo; "name" ordena A-Z.
 */

export const PLAYER_SORT_KEYS = ["rating", "matches", "goals", "assists", "name"] as const;

export type PlayerSortKey = (typeof PLAYER_SORT_KEYS)[number];

export interface SortablePlayer {
  nickname: string;
  /** Valoración visible (motor o nivel inicial). */
  rating: number;
  stats: { matches: number; goals: number; assists: number };
}

export function isPlayerSortKey(value: unknown): value is PlayerSortKey {
  return typeof value === "string" && (PLAYER_SORT_KEYS as readonly string[]).includes(value);
}

const byNickname = (a: SortablePlayer, b: SortablePlayer) => a.nickname.localeCompare(b.nickname, "es-AR");

const METRIC: Record<Exclude<PlayerSortKey, "name">, (p: SortablePlayer) => number> = {
  rating: (p) => p.rating,
  matches: (p) => p.stats.matches,
  goals: (p) => p.stats.goals,
  assists: (p) => p.stats.assists,
};

/** Devuelve una copia ordenada; no modifica el arreglo original. */
export function sortPlayers<T extends SortablePlayer>(players: readonly T[], key: PlayerSortKey): T[] {
  if (key === "name") return [...players].sort(byNickname);
  const metric = METRIC[key];
  return [...players].sort((a, b) => metric(b) - metric(a) || byNickname(a, b));
}

/** Los `n` mejores por valoración (empates por apodo). */
export function topByRating<T extends SortablePlayer>(players: readonly T[], n: number): T[] {
  if (!(n > 0)) return [];
  return sortPlayers(players, "rating").slice(0, n);
}
