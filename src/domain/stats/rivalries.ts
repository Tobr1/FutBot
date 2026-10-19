/**
 * Duplas y rivales a partir de los partidos jugados: socio ideal (mejor
 * efectividad juntos), rival favorito (a quien más le gana) y némesis (contra
 * quien peor le va), más el ranking de duplas del grupo. Puro.
 */

import type { MatchLineRow } from "./engine-input";
import { sideResult, summarizeMatches } from "./match-summaries";

/** Mínimo de partidos juntos o en contra para que una relación cuente. */
export const RIVALRY_MIN_MATCHES = 3;

export interface Record3 {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface PairRecord extends Record3 {
  playerId: string;
  /** Puntos sobre jugados: (PG + PE/2) / PJ, entre 0 y 1. */
  rate: number;
}

const emptyRecord = (): Record3 => ({ matches: 0, wins: 0, draws: 0, losses: 0 });
const rateOf = (r: Record3) => (r.matches > 0 ? (r.wins + 0.5 * r.draws) / r.matches : 0);

function add(record: Record3, result: "win" | "draw" | "loss") {
  record.matches += 1;
  if (result === "win") record.wins += 1;
  else if (result === "draw") record.draws += 1;
  else record.losses += 1;
}

export interface PlayerRelations {
  /** Compañeros: récord jugando en el mismo equipo. */
  teammates: PairRecord[];
  /** Rivales: récord del jugador enfrentándolos. */
  opponents: PairRecord[];
}

/** Récord con cada compañero y cada rival de un jugador. */
export function playerRelations(lines: readonly MatchLineRow[], playerId: string): PlayerRelations {
  const teammates = new Map<string, Record3>();
  const opponents = new Map<string, Record3>();
  for (const match of summarizeMatches(lines)) {
    const mine = match.lines.get(playerId);
    if (!mine) continue;
    const result = sideResult(match, mine.side);
    for (const [id, line] of match.lines) {
      if (id === playerId) continue;
      const map = line.side === mine.side ? teammates : opponents;
      const record = map.get(id) ?? emptyRecord();
      add(record, result);
      map.set(id, record);
    }
  }
  const toList = (map: Map<string, Record3>) =>
    [...map.entries()].map(([id, r]) => ({ playerId: id, ...r, rate: rateOf(r) })).sort((x, y) => (x.playerId < y.playerId ? -1 : 1));
  return { teammates: toList(teammates), opponents: toList(opponents) };
}

export interface Rivalries {
  /** Compañero con mejor efectividad juntos. */
  partner: PairRecord | null;
  /** Rival al que más veces le ganó (y le gana más de lo que pierde). */
  favoriteVictim: PairRecord | null;
  /** Rival contra el que peor le va (pierde más de lo que gana). */
  nemesis: PairRecord | null;
}

/** Socio ideal, rival favorito y némesis de un jugador (con un mínimo de partidos). */
export function findRivalries(lines: readonly MatchLineRow[], playerId: string, minMatches = RIVALRY_MIN_MATCHES): Rivalries {
  const { teammates, opponents } = playerRelations(lines, playerId);
  const min = Math.max(1, minMatches);

  const partner =
    teammates
      .filter((t) => t.matches >= min && t.wins > 0)
      .sort((x, y) => y.rate - x.rate || y.matches - x.matches || y.wins - x.wins)[0] ?? null;

  const eligible = opponents.filter((o) => o.matches >= min);
  const favoriteVictim =
    eligible
      .filter((o) => o.wins > o.losses)
      .sort((x, y) => y.wins - x.wins || y.rate - x.rate || y.matches - x.matches)[0] ?? null;
  const nemesis =
    eligible
      .filter((o) => o.losses > o.wins && o.playerId !== favoriteVictim?.playerId)
      .sort((x, y) => x.rate - y.rate || y.losses - x.losses || y.matches - x.matches)[0] ?? null;

  return { partner, favoriteVictim, nemesis };
}

export interface DuoRecord extends Record3 {
  players: [string, string];
  rate: number;
}

/** Mejores duplas del grupo por efectividad jugando juntos (mínimo de partidos juntos). */
export function duoRanking(lines: readonly MatchLineRow[], options: { minMatches?: number; limit?: number } = {}): DuoRecord[] {
  const min = Math.max(1, options.minMatches ?? RIVALRY_MIN_MATCHES);
  const pairs = new Map<string, Record3>();
  for (const match of summarizeMatches(lines)) {
    for (const side of ["a", "b"] as const) {
      const ids = [...match.teams[side]].sort();
      const result = sideResult(match, side);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${ids[i]}|${ids[j]}`;
          const record = pairs.get(key) ?? emptyRecord();
          add(record, result);
          pairs.set(key, record);
        }
      }
    }
  }
  return [...pairs.entries()]
    .filter(([, r]) => r.matches >= min)
    .map(([key, r]) => ({ players: key.split("|") as [string, string], ...r, rate: rateOf(r) }))
    .sort(
      (x, y) =>
        y.rate - x.rate ||
        y.matches - x.matches ||
        y.wins - x.wins ||
        (x.players.join() < y.players.join() ? -1 : 1),
    )
    .slice(0, Math.max(0, options.limit ?? 10));
}

/** "4 PG · 1 PE · 0 PP" */
export function recordText(r: Record3): string {
  return `${r.wins} PG · ${r.draws} PE · ${r.losses} PP`;
}

/** Efectividad entera para mostrar ("75%"). */
export function rateText(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
