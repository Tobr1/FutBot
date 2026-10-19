/**
 * Rankings a partir del resultado del motor y de los totales por jugador
 * (docs/ANALISIS.md §6.4). Puro: la UI solo elige la pestaña.
 */

import { overall } from "@/domain/players/rating";
import { effectiveness } from "@/domain/players/stats";
import type { RatingResult } from "./types";

/** Totales por jugador como los devuelve `get_player_stats`. */
export interface PlayerTotals {
  playerId: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  mvps: number;
}

export type RankingKind =
  | "best"
  | "scorers"
  | "assisters"
  | "bestAverage"
  | "winRate"
  | "mostRegular"
  | "mvps"
  | "form";

export interface RankingEntry {
  playerId: string;
  value: number;
  /** Valor listo para mostrar (es-AR: coma decimal). */
  display: string;
  matches: number;
}

export interface RankingList {
  entries: RankingEntry[];
  /** Jugadores con al menos un partido que no entran en la lista (no llegan al mínimo o no tienen el dato). */
  excluded: number;
}

export type Rankings = Record<RankingKind, RankingList>;

export interface RankingOptions {
  /** Mínimo de partidos jugados (`ranking_min_matches` del grupo). */
  minMatches: number;
  /** Mínimo de partidos con votos para "Mejor promedio". Por defecto, `minMatches`. */
  minVotedMatches?: number;
}

/** Número con un decimal y coma (7.45 → "7,5"). Evita "-0,0". */
export function formatDecimal(n: number, digits = 1): string {
  const fixed = n.toFixed(digits);
  const isZero = Number(fixed) === 0;
  return (isZero ? (0).toFixed(digits) : fixed).replace(".", ",");
}

/** Diferencia con signo explícito ("+0,8", "-0,3", "0,0"). */
export function formatSigned(n: number, digits = 1): string {
  const text = formatDecimal(n, digits);
  return Number(n.toFixed(digits)) > 0 ? `+${text}` : text;
}

interface Candidate {
  entry: RankingEntry;
  /** Desempate principal (mayor primero). */
  tiebreak: number;
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function finalize(candidates: Candidate[], universe: number): RankingList {
  const entries = [...candidates]
    .sort(
      (x, y) =>
        y.entry.value - x.entry.value ||
        y.tiebreak - x.tiebreak ||
        y.entry.matches - x.entry.matches ||
        compareIds(x.entry.playerId, y.entry.playerId),
    )
    .map((c) => c.entry);
  return { entries, excluded: Math.max(0, universe - entries.length) };
}

export function buildRankings(
  result: RatingResult,
  totals: readonly PlayerTotals[],
  options: RankingOptions,
): Rankings {
  const minMatches = Math.max(1, options.minMatches);
  const minVoted = Math.max(1, options.minVotedMatches ?? minMatches);

  const totalsById = new Map(totals.map((t) => [t.playerId, t]));
  const ratingIds = Object.keys(result.byPlayer).filter((id) => result.byPlayer[id].matches > 0);
  const totalIds = totals.filter((t) => t.matches > 0).map((t) => t.playerId);

  // Rankings de valoración: sobre los jugadores con partidos en el motor.
  const ratingUniverse = ratingIds.length;
  const best: Candidate[] = [];
  const bestAverage: Candidate[] = [];
  const mostRegular: Candidate[] = [];
  const form: Candidate[] = [];
  for (const id of ratingIds) {
    const r = result.byPlayer[id];
    if (r.matches >= minMatches) {
      best.push({
        entry: { playerId: id, value: r.conservative, display: String(overall(r.conservative)), matches: r.matches },
        tiebreak: r.skill,
      });
    }
    if (r.performanceAvg !== null && r.matchesWithVotes >= minVoted) {
      bestAverage.push({
        entry: {
          playerId: id,
          value: r.performanceAvg,
          display: formatDecimal(r.performanceAvg),
          matches: r.matchesWithVotes,
        },
        tiebreak: r.matchesWithVotes,
      });
    }
    if (r.consistency !== null) {
      mostRegular.push({
        entry: {
          playerId: id,
          value: r.consistency,
          display: String(Math.round(r.consistency)),
          matches: r.matchesWithVotes,
        },
        tiebreak: r.matchesWithVotes,
      });
    }
    if (r.recentForm !== null) {
      form.push({
        entry: { playerId: id, value: r.recentForm, display: formatSigned(r.recentForm), matches: r.matches },
        tiebreak: r.matchesWithVotes,
      });
    }
  }

  // Rankings de totales: desempate por promedio por partido, luego partidos.
  const totalsUniverse = totalIds.length;
  const byTotal = (pick: (t: PlayerTotals) => number): Candidate[] =>
    totalIds
      .map((id) => totalsById.get(id)!)
      .filter((t) => pick(t) > 0)
      .map((t) => ({
        entry: { playerId: t.playerId, value: pick(t), display: String(pick(t)), matches: t.matches },
        tiebreak: pick(t) / t.matches,
      }));

  const winRate: Candidate[] = totalIds
    .map((id) => totalsById.get(id)!)
    .filter((t) => t.matches >= minMatches)
    .map((t) => {
      const value = (t.wins + 0.5 * t.draws) / t.matches;
      return {
        entry: { playerId: t.playerId, value, display: `${effectiveness(t)}%`, matches: t.matches },
        tiebreak: t.matches,
      };
    });

  return {
    best: finalize(best, ratingUniverse),
    scorers: finalize(byTotal((t) => t.goals), totalsUniverse),
    assisters: finalize(byTotal((t) => t.assists), totalsUniverse),
    bestAverage: finalize(bestAverage, ratingUniverse),
    winRate: finalize(winRate, totalsUniverse),
    mostRegular: finalize(mostRegular, ratingUniverse),
    mvps: finalize(byTotal((t) => t.mvps), totalsUniverse),
    form: finalize(form, ratingUniverse),
  };
}
