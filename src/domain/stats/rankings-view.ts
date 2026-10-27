/**
 * Presentación de los rankings (docs/ANALISIS.md §6.4): pestañas, textos de
 * exclusión y lectura de filtros de la URL. Las listas las arma
 * `buildRankings` del motor.
 */

import type { RankingKind } from "@/domain/rating";

export interface RankingTab {
  kind: RankingKind;
  /** Valor para la URL (`?ranking=`). */
  slug: string;
  label: string;
  /** Qué mide, en una línea. */
  description: string;
  /** Unidad corta junto al valor ("goles", "pts"…); vacía si el número se explica solo. */
  unit: string;
}

export const RANKING_TABS: readonly RankingTab[] = [
  { kind: "best", slug: "mejor", label: "Mejor jugador", description: "Valoración con nivel alto y sostenido.", unit: "" },
  { kind: "scorers", slug: "goleadores", label: "Goleadores", description: "Goles en la temporada.", unit: "goles" },
  { kind: "bestAverage", slug: "promedio", label: "Mejor promedio", description: "Promedio de calificaciones por partido.", unit: "" },
  { kind: "winRate", slug: "victorias", label: "% victorias", description: "Ganados más medio empate, sobre jugados.", unit: "" },
  { kind: "mostRegular", slug: "regular", label: "Más regular", description: "Calificaciones más parejas (0 a 100).", unit: "" },
  { kind: "mvps", slug: "mvp", label: "MVP", description: "Veces elegido el mejor del partido.", unit: "MVP" },
  { kind: "form", slug: "momento", label: "Mejor momento", description: "Últimos 5 partidos contra su nivel.", unit: "" },
];

export function rankingTabBySlug(slug: string | string[] | undefined): RankingTab {
  const value = Array.isArray(slug) ? slug[0] : slug;
  return RANKING_TABS.find((t) => t.slug === value) ?? RANKING_TABS[0];
}

export const MIN_MATCHES_LIMIT = 50;

/** `?min=` → entero entre 1 y 50, o el mínimo del grupo. */
export function parseMinMatches(value: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  const base = Number.isInteger(fallback) && fallback >= 1 ? Math.min(fallback, MIN_MATCHES_LIMIT) : 1;
  if (raw === undefined || raw === "" || !Number.isInteger(n) || n < 1) return base;
  return Math.min(n, MIN_MATCHES_LIMIT);
}

const players = (n: number) => `${n} ${n === 1 ? "jugador" : "jugadores"}`;
const matches = (n: number) => `${n} ${n === 1 ? "partido" : "partidos"}`;

/** Aviso de cuántos quedan afuera y por qué; null si no queda nadie afuera. */
export function excludedLabel(kind: RankingKind, excluded: number, minMatches: number): string | null {
  if (!(excluded > 0)) return null;
  const n = players(excluded);
  const verb = excluded === 1 ? "no llega" : "no llegan";
  switch (kind) {
    case "best":
    case "winRate":
      return `${n} ${verb} al mínimo de ${matches(minMatches)}.`;
    case "bestAverage":
      return `${n} ${verb} al mínimo de ${matches(minMatches)} con votos.`;
    case "mostRegular":
      return `${n} sin 5 partidos con votos.`;
    case "form":
      return `${n} sin votos suficientes en sus últimos 5 partidos.`;
    case "scorers":
      return `${n} sin goles.`;
    case "assisters":
      return `${n} sin asistencias.`;
    case "mvps":
      return `${n} sin MVP.`;
  }
}

/** Estado vacío de cada ranking cuando nadie entra. */
export function emptyRankingText(kind: RankingKind, minMatches: number): string {
  switch (kind) {
    case "best":
    case "winRate":
      return `Nadie jugó todavía ${matches(minMatches)}. Bajá el mínimo o esperá a la próxima fecha.`;
    case "bestAverage":
      return `Hacen falta ${matches(minMatches)} con votos cerrados.`;
    case "mostRegular":
      return "Hacen falta 5 partidos con votos para medir la regularidad.";
    case "form":
      return "Hacen falta votos en al menos 3 de los últimos 5 partidos.";
    case "scorers":
      return "Todavía no hay goles cargados.";
    case "assisters":
      return "Todavía no hay asistencias cargadas.";
    case "mvps":
      return "Todavía no hay MVP elegidos.";
  }
}
