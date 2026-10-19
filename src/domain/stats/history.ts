/**
 * Historial de partidos: agrupado por mes en la zona horaria del grupo,
 * paginado con "Ver más" y resumen por partido. Puro.
 */

import { isoToZoned } from "@/domain/matches/datetime";

export const HISTORY_PAGE_SIZE = 20;
/** Tope de páginas acumuladas (20 × 25 = 500 partidos en una sola vista). */
export const HISTORY_MAX_PAGES = 25;

const MONTHS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** `?page=` → página entre 1 y el tope (cualquier otra cosa es 1). */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, HISTORY_MAX_PAGES);
}

/** "2026-10" → "Octubre 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_LONG[(month - 1 + 12) % 12]} ${year}`;
}

export interface MonthGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Agrupa por mes local conservando el orden de entrada (los grupos salen en el orden en que aparecen). */
export function groupByMonth<T>(items: readonly T[], getIso: (item: T) => string, timeZone: string): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  const byKey = new Map<string, MonthGroup<T>>();
  for (const item of items) {
    const key = isoToZoned(getIso(item), timeZone).date.slice(0, 7);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: monthLabel(key), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/** Promedio de calificaciones de un partido (media de las medias por jugador); null sin votos. */
export function averageRating(values: ReadonlyArray<number | null>): number | null {
  const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
}

export interface ScorerTally {
  playerId: string;
  count: number;
}

/** Goleadores de un partido (sin goles en contra ni sin autor), del que más hizo al que menos. */
export function tallyScorers(goals: ReadonlyArray<{ playerId: string | null }>, nameOf: (id: string) => string): ScorerTally[] {
  const counts = new Map<string, number>();
  for (const g of goals) if (g.playerId) counts.set(g.playerId, (counts.get(g.playerId) ?? 0) + 1);
  return [...counts.entries()]
    .map(([playerId, count]) => ({ playerId, count }))
    .sort((x, y) => y.count - x.count || nameOf(x.playerId).localeCompare(nameOf(y.playerId), "es-AR"));
}

/** "Brito 2, Manu, Tano" (como máximo `max` nombres y "+N"). */
export function scorersText(tallies: readonly ScorerTally[], nameOf: (id: string) => string, max = 3): string {
  if (tallies.length === 0) return "";
  const shown = tallies.slice(0, max).map((t) => (t.count > 1 ? `${nameOf(t.playerId)} ${t.count}` : nameOf(t.playerId)));
  const rest = tallies.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
}
