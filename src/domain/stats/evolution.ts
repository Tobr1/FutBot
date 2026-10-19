/**
 * Serie del gráfico "Evolución" de la ficha: habilidad estimada S después de
 * cada partido (línea) y rendimiento P de ese partido (puntos).
 */

import { isoToZoned } from "@/domain/matches/datetime";
import { formatDecimal, formatSigned, type PlayerHistoryPoint } from "@/domain/rating";

export interface EvolutionPoint {
  matchId: string;
  /** YYYY-MM-DD local. */
  date: string;
  /** "25/10". */
  label: string;
  /** S con 2 decimales. */
  skill: number;
  /** P con 2 decimales; null sin votos válidos. */
  performance: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Últimos `limit` partidos en orden cronológico, con fecha local. */
export function evolutionSeries(history: readonly PlayerHistoryPoint[], timeZone: string, limit = 30): EvolutionPoint[] {
  return history.slice(-Math.max(1, limit)).map((point) => {
    const date = isoToZoned(point.playedAt, timeZone).date;
    const [, month, day] = date.split("-");
    return {
      matchId: point.matchId,
      date,
      label: `${day}/${month}`,
      skill: round2(point.skill),
      performance: point.performance === null ? null : round2(point.performance),
    };
  });
}

/**
 * Eje Y ajustado a los datos (con medio punto de aire), dentro de 1-10 y con
 * al menos 2 puntos de alto para que una serie plana no parezca un serrucho.
 */
export function evolutionDomain(points: readonly EvolutionPoint[]): [number, number] {
  const values = points.flatMap((p) => (p.performance === null ? [p.skill] : [p.skill, p.performance]));
  if (values.length === 0) return [1, 10];
  let min = Math.max(1, Math.floor(Math.min(...values) - 0.5));
  let max = Math.min(10, Math.ceil(Math.max(...values) + 0.5));
  while (max - min < 2) {
    if (min > 1) min -= 1;
    if (max - min < 2 && max < 10) max += 1;
    if (min === 1 && max === 10) break;
  }
  return [min, max];
}

/** Descripción accesible del gráfico. */
export function evolutionSummary(points: readonly EvolutionPoint[]): string {
  if (points.length === 0) return "Todavía no hay partidos para mostrar la evolución.";
  const first = points[0];
  const last = points[points.length - 1];
  const n = points.length;
  const voted = points.filter((p) => p.performance !== null).length;
  const matches = `${n} ${n === 1 ? "partido" : "partidos"}`;
  const votes = voted === 0 ? "sin calificaciones" : `${voted} con calificaciones`;
  if (n === 1) return `Valoración ${formatDecimal(last.skill)} después de 1 partido (${votes}).`;
  return `Valoración de ${formatDecimal(first.skill)} a ${formatDecimal(last.skill)} (${formatSigned(last.skill - first.skill)}) en ${matches}, ${votes}.`;
}
