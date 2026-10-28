/**
 * Armado manual de equipos: intercambios por toque, fuerza de cada equipo y un
 * reparto rápido en serpiente. El optimizador "Generar parejos" vive aparte
 * (src/domain/balancer); acá solo hay ayudas simples y deterministas.
 */
import type { Side } from "./result";

export type Assignment = Side | null;

/**
 * Intercambia a dos jugadores: cada uno queda donde estaba el otro (equipo o
 * sin equipo). Sirve para "cambiar uno por otro" sin desarmar nada más.
 */
export function swapPlayers(
  assignment: Readonly<Record<string, Assignment>>,
  first: string,
  second: string,
): Record<string, Assignment> {
  const firstSide = assignment[first] ?? null;
  const secondSide = assignment[second] ?? null;
  return { ...assignment, [first]: secondSide, [second]: firstSide };
}

/** Otro equipo. */
export const otherSide = (side: Side): Side => (side === "a" ? "b" : "a");

export interface TeamStrength {
  count: number;
  /** Suma de niveles (1 decimal). */
  sum: number;
  /** Promedio (1 decimal) o null si el equipo está vacío. */
  avg: number | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function teamStrength(ratings: readonly number[]): TeamStrength {
  const total = ratings.reduce((acc, r) => acc + r, 0);
  return {
    count: ratings.length,
    sum: round1(total),
    avg: ratings.length > 0 ? round1(total / ratings.length) : null,
  };
}

/**
 * Proporción (0–1) de la suma de niveles que tiene el equipo A. Se compara
 * por suma: si un equipo tiene uno menos, compensa con jugadores mejores.
 */
export function balanceShare(a: TeamStrength, b: TeamStrength): number {
  const total = a.sum + b.sum;
  if (total <= 0) return 0.5;
  return a.sum / total;
}

/** Diferencia de nivel en % respecto del promedio de las dos sumas (0 = idénticos). */
export function balanceGapPercent(a: TeamStrength, b: TeamStrength): number {
  const mean = (a.sum + b.sum) / 2;
  if (mean <= 0) return 0;
  return Math.round((Math.abs(a.sum - b.sum) / mean) * 100);
}

export type BalanceLabel = "parejo" | "leve" | "desparejo";

/** Lectura rápida de la diferencia para la barra de equilibrio. */
export function balanceLabel(gapPercent: number): BalanceLabel {
  if (gapPercent <= 5) return "parejo";
  if (gapPercent <= 15) return "leve";
  return "desparejo";
}

export interface DraftPlayer {
  id: string;
  rating: number;
  nickname: string;
}

/**
 * Reparto en serpiente por nivel (A, B, B, A, A, B…). Determinista: ordena
 * por nivel descendente, después por apodo y por id.
 */
export function snakeDraft(players: readonly DraftPlayer[]): { a: string[]; b: string[] } {
  const sorted = [...players].sort(
    (x, y) => y.rating - x.rating || x.nickname.localeCompare(y.nickname, "es") || x.id.localeCompare(y.id),
  );
  const a: string[] = [];
  const b: string[] = [];
  sorted.forEach((player, index) => {
    const round = Math.floor(index / 2);
    const first = index % 2 === 0;
    const toA = round % 2 === 0 ? first : !first;
    (toA ? a : b).push(player.id);
  });
  return { a, b };
}

/** Motivo por el que no se pueden guardar los equipos, o null. */
export function teamsSaveIssue(countA: number, countB: number): string | null {
  if (countA === 0 || countB === 0) return "Cada equipo necesita al menos un jugador.";
  return null;
}

export const DEFAULT_TEAM_NAMES: Record<Side, string> = { a: "Azul", b: "Rojo" };
export const TEAM_NAME_MAX = 30;

/** Nombre de equipo saneado (vacío → nombre por defecto). */
export function cleanTeamName(value: string, side: Side): string {
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, TEAM_NAME_MAX);
  return trimmed || DEFAULT_TEAM_NAMES[side];
}
