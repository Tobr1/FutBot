/**
 * Comparación entre dos jugadores: cara a cara (`get_head_to_head`) y
 * estadísticas lado a lado. Puro: arma textos y marca quién está mejor.
 */

import { effectiveness } from "@/domain/players/stats";

export interface HeadToHead {
  togetherMatches: number;
  togetherWins: number;
  togetherDraws: number;
  togetherLosses: number;
  againstMatches: number;
  /** Victorias de A sobre B. */
  aWins: number;
  bWins: number;
  draws: number;
}

export const EMPTY_HEAD_TO_HEAD: HeadToHead = {
  togetherMatches: 0,
  togetherWins: 0,
  togetherDraws: 0,
  togetherLosses: 0,
  againstMatches: 0,
  aWins: 0,
  bWins: 0,
  draws: 0,
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface HeadToHeadText {
  /** Titular del duelo, p. ej. "Brito gana el cara a cara 3–1". */
  headline: string;
  /** "5 partidos juntos · 3 PG · 1 PE · 1 PP"; null si nunca jugaron juntos. */
  together: string | null;
  /** "4 partidos en contra · 1 empate"; null si nunca se enfrentaron. */
  against: string | null;
}

export function headToHeadText(h: HeadToHead, nameA: string, nameB: string): HeadToHeadText {
  const together =
    h.togetherMatches > 0
      ? `${plural(h.togetherMatches, "partido juntos", "partidos juntos")} · ${h.togetherWins} PG · ${h.togetherDraws} PE · ${h.togetherLosses} PP`
      : null;
  const against =
    h.againstMatches > 0
      ? `${plural(h.againstMatches, "partido en contra", "partidos en contra")}${h.draws > 0 ? ` · ${plural(h.draws, "empate", "empates")}` : ""}`
      : null;

  let headline: string;
  if (h.againstMatches === 0) {
    headline = h.togetherMatches === 0 ? "Todavía no coincidieron en un partido" : "Nunca se enfrentaron";
  } else if (h.aWins === h.bWins) {
    headline = `Parejos en el cara a cara (${h.aWins}–${h.bWins})`;
  } else {
    const aAhead = h.aWins > h.bWins;
    headline = `${aAhead ? nameA : nameB} gana el cara a cara ${Math.max(h.aWins, h.bWins)}–${Math.min(h.aWins, h.bWins)}`;
  }
  return { headline, together, against };
}

/** Totales comparables de un jugador (los de `get_player_stats` + valoración). */
export interface ComparableStats {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  mvps: number;
  /** Valoración 10-99 de la tarjeta. */
  overall: number;
}

export interface CompareRow {
  key: string;
  label: string;
  a: string;
  b: string;
  /** Quién está mejor en esa fila (null = empate o sin dato). */
  better: "a" | "b" | null;
}

function pick(a: number | null, b: number | null, higherIsBetter = true): "a" | "b" | null {
  if (a === null || b === null || a === b) return null;
  return a > b === higherIsBetter ? "a" : "b";
}

const perMatch = (total: number, matches: number) => (matches > 0 ? total / matches : null);
const fmt1 = (n: number | null) => (n === null ? "—" : n.toFixed(1).replace(".", ","));

export function compareRows(a: ComparableStats, b: ComparableStats): CompareRow[] {
  const effA = effectiveness(a);
  const effB = effectiveness(b);
  const gpmA = perMatch(a.goals, a.matches);
  const gpmB = perMatch(b.goals, b.matches);
  return [
    { key: "overall", label: "Valoración", a: String(a.overall), b: String(b.overall), better: pick(a.overall, b.overall) },
    { key: "matches", label: "Partidos", a: String(a.matches), b: String(b.matches), better: pick(a.matches, b.matches) },
    {
      key: "winRate",
      label: "% victorias",
      a: effA === null ? "—" : `${effA}%`,
      b: effB === null ? "—" : `${effB}%`,
      better: pick(effA, effB),
    },
    { key: "wins", label: "Ganados", a: String(a.wins), b: String(b.wins), better: pick(a.wins, b.wins) },
    { key: "goals", label: "Goles", a: String(a.goals), b: String(b.goals), better: pick(a.goals, b.goals) },
    { key: "goalsPerMatch", label: "Goles por partido", a: fmt1(gpmA), b: fmt1(gpmB), better: pick(gpmA, gpmB) },
    { key: "assists", label: "Asistencias", a: String(a.assists), b: String(b.assists), better: pick(a.assists, b.assists) },
    { key: "mvps", label: "MVP", a: String(a.mvps), b: String(b.mvps), better: pick(a.mvps, b.mvps) },
  ];
}
