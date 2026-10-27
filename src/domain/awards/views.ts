/**
 * Lecturas de los logros para cada pantalla: ficha (ganados y progreso),
 * detalle del partido, inicio del grupo y Salón de la fama (récords). Puro.
 */

import type { MatchLineRow } from "@/domain/stats/engine-input";
import { compareChronological, type MatchSummary, sideResult, summarizeMatches } from "@/domain/stats/match-summaries";
import { ATTENDANCE_STREAKS, MATCH_MILESTONES, type Milestone, MVP_MILESTONES, WIN_STREAKS } from "./compute";
import { type Award, type AwardIcon, type AwardKind, type AwardTier, TIER_RANK } from "./types";

export function awardsForPlayer(awards: readonly Award[], playerId: string): Award[] {
  return awards.filter((a) => a.playerId === playerId);
}

/** Logros ganados en un partido (los de oro primero). */
export function awardsForMatch(awards: readonly Award[], matchId: string): Award[] {
  return awards
    .filter((a) => a.matchId === matchId)
    .sort((x, y) => TIER_RANK[y.tier] - TIER_RANK[x.tier] || (x.id < y.id ? -1 : 1));
}

/** Kinds que no se muestran en el feed del grupo por ser demasiado frecuentes. */
const FEED_EXCLUDED: ReadonlySet<AwardKind> = new Set(["debut"]);

/** Últimos `n` logros del grupo para el inicio (sin los debuts). Asume `awards` ordenado (computeAwards). */
export function latestAwards(awards: readonly Award[], n = 5): Award[] {
  return awards.filter((a) => !FEED_EXCLUDED.has(a.kind)).slice(0, Math.max(0, n));
}

export interface AwardGroup {
  /** El más reciente de los iguales. */
  award: Award;
  /** Cuántas veces lo ganó. */
  count: number;
}

/**
 * Agrupa los logros repetidos (mismo título y tier: "Doblete ×3") del jugador
 * conservando el más reciente; primero los de oro, después los más nuevos.
 */
export function groupAwards(awards: readonly Award[]): AwardGroup[] {
  const byKey = new Map<string, AwardGroup>();
  for (const award of awards) {
    const key = `${award.kind}|${award.title}|${award.tier}`;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, { award, count: 1 });
    else {
      prev.count += 1;
      if (compareChronological({ scheduledAt: award.earnedAt, matchId: award.id }, { scheduledAt: prev.award.earnedAt, matchId: prev.award.id }) > 0) {
        prev.award = award;
      }
    }
  }
  return [...byKey.values()].sort(
    (x, y) =>
      TIER_RANK[y.award.tier] - TIER_RANK[x.award.tier] ||
      compareChronological({ scheduledAt: y.award.earnedAt, matchId: y.award.id }, { scheduledAt: x.award.earnedAt, matchId: x.award.id }),
  );
}

/* ---------- Rachas ---------- */

export interface StreakRecord {
  value: number;
  /** ISO del partido en que terminó (o sigue) la racha más larga. */
  endAt: string | null;
}

export interface PlayerStreaks {
  matches: number;
  mvps: number;
  bestWin: StreakRecord;
  bestUnbeaten: StreakRecord;
  bestAttendance: StreakRecord;
  currentWin: number;
  currentUnbeaten: number;
  currentAttendance: number;
}

const emptyStreaks = (): PlayerStreaks => ({
  matches: 0,
  mvps: 0,
  bestWin: { value: 0, endAt: null },
  bestUnbeaten: { value: 0, endAt: null },
  bestAttendance: { value: 0, endAt: null },
  currentWin: 0,
  currentUnbeaten: 0,
  currentAttendance: 0,
});

/** Rachas de cada jugador en el orden cronológico de los partidos. */
export function playerStreaks(matches: readonly MatchSummary[]): Map<string, PlayerStreaks> {
  const out = new Map<string, PlayerStreaks>();
  for (const match of matches) {
    for (const [id, st] of out) if (!match.lines.has(id)) st.currentAttendance = 0;
    for (const [id, line] of match.lines) {
      let st = out.get(id);
      if (!st) {
        st = emptyStreaks();
        out.set(id, st);
      }
      const result = sideResult(match, line.side);
      st.matches += 1;
      if (line.isMvp) st.mvps += 1;
      st.currentWin = result === "win" ? st.currentWin + 1 : 0;
      st.currentUnbeaten = result === "loss" ? 0 : st.currentUnbeaten + 1;
      st.currentAttendance += 1;
      if (st.currentWin > st.bestWin.value) st.bestWin = { value: st.currentWin, endAt: match.scheduledAt };
      if (st.currentUnbeaten > st.bestUnbeaten.value) st.bestUnbeaten = { value: st.currentUnbeaten, endAt: match.scheduledAt };
      if (st.currentAttendance > st.bestAttendance.value) st.bestAttendance = { value: st.currentAttendance, endAt: match.scheduledAt };
    }
  }
  return out;
}

/* ---------- Progreso (logros bloqueados) ---------- */

export interface AwardProgress {
  key: "matches" | "mvp" | "win-streak" | "attendance";
  title: string;
  description: string;
  icon: AwardIcon;
  tier: AwardTier;
  current: number;
  target: number;
  /** Ya ganó el último escalón. */
  complete: boolean;
}

function nextMilestone(current: number, milestones: readonly Milestone[]): { target: Milestone; complete: boolean } {
  const next = milestones.find((m) => m.n > current);
  return next ? { target: next, complete: false } : { target: milestones[milestones.length - 1], complete: true };
}

/** Próximo escalón de los logros por hitos (partidos, MVP, racha ganadora, asistencia). */
export function awardProgress(lines: readonly MatchLineRow[], playerId: string): AwardProgress[] {
  const st = playerStreaks(summarizeMatches(lines)).get(playerId) ?? emptyStreaks();
  const items: Array<Omit<AwardProgress, "target" | "tier" | "complete"> & { milestones: readonly Milestone[] }> = [
    {
      key: "matches",
      title: "Partidos jugados",
      description: "Sumá partidos con el grupo",
      icon: "Medal",
      current: st.matches,
      milestones: MATCH_MILESTONES,
    },
    { key: "mvp", title: "MVP", description: "Sé el mejor del partido", icon: "Star", current: st.mvps, milestones: MVP_MILESTONES },
    {
      key: "win-streak",
      title: "Racha ganadora",
      description: "Victorias seguidas (mejor racha)",
      icon: "Zap",
      current: st.bestWin.value,
      milestones: WIN_STREAKS,
    },
    {
      key: "attendance",
      title: "Siempre presente",
      description: "Partidos seguidos sin faltar (mejor racha)",
      icon: "CalendarCheck",
      current: st.bestAttendance.value,
      milestones: ATTENDANCE_STREAKS,
    },
  ];
  return items.map(({ milestones, ...item }) => {
    const { target, complete } = nextMilestone(item.current, milestones);
    return { ...item, target: target.n, tier: target.tier, complete, current: complete ? Math.max(item.current, target.n) : item.current };
  });
}

/* ---------- Récords del grupo ---------- */

export interface PlayerRecord {
  kind: "goals-in-match" | "assists-in-match" | "win-streak" | "unbeaten-streak" | "attendance-streak";
  title: string;
  playerId: string;
  value: number;
  /** "4 goles", "7 victorias". */
  display: string;
  at: string;
  matchId: string | null;
}

export interface MatchRecord {
  kind: "biggest-win" | "most-goals";
  title: string;
  matchId: string;
  at: string;
  score: { a: number; b: number };
  display: string;
}

export interface GroupRecords {
  players: PlayerRecord[];
  matches: MatchRecord[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Récords del grupo. A igualdad, el récord es de quien lo logró primero
 * (y a igual fecha, del id menor, para que sea determinista).
 */
export function computeRecords(lines: readonly MatchLineRow[]): GroupRecords {
  const matches = summarizeMatches(lines);
  const players: PlayerRecord[] = [];
  const matchRecords: MatchRecord[] = [];
  if (matches.length === 0) return { players, matches: matchRecords };

  let goals: { id: string; value: number; match: MatchSummary } | null = null;
  let biggest: MatchSummary | null = null;
  let mostGoals: MatchSummary | null = null;
  for (const match of matches) {
    for (const id of [...match.lines.keys()].sort()) {
      const line = match.lines.get(id)!;
      if (line.goals > 0 && (!goals || line.goals > goals.value)) goals = { id, value: line.goals, match };
    }
    const diff = Math.abs(match.score.a - match.score.b);
    if (diff > 0 && (!biggest || diff > Math.abs(biggest.score.a - biggest.score.b))) biggest = match;
    const total = match.score.a + match.score.b;
    if (total > 0 && (!mostGoals || total > mostGoals.score.a + mostGoals.score.b)) mostGoals = match;
  }
  if (goals) {
    players.push({
      kind: "goals-in-match",
      title: "Más goles en un partido",
      playerId: goals.id,
      value: goals.value,
      display: plural(goals.value, "gol", "goles"),
      at: goals.match.scheduledAt,
      matchId: goals.match.matchId,
    });
  }

  const streaks = playerStreaks(matches);
  const bestOf = (pick: (s: PlayerStreaks) => StreakRecord) => {
    let best: { id: string; record: StreakRecord } | null = null;
    for (const id of [...streaks.keys()].sort()) {
      const record = pick(streaks.get(id)!);
      if (record.value <= 0 || !record.endAt) continue;
      if (
        !best ||
        record.value > best.record.value ||
        (record.value === best.record.value &&
          compareChronological({ scheduledAt: record.endAt, matchId: id }, { scheduledAt: best.record.endAt!, matchId: best.id }) < 0)
      ) {
        best = { id, record };
      }
    }
    return best;
  };
  const win = bestOf((s) => s.bestWin);
  if (win && win.record.value >= 2) {
    players.push({
      kind: "win-streak",
      title: "Racha ganadora más larga",
      playerId: win.id,
      value: win.record.value,
      display: plural(win.record.value, "victoria", "victorias"),
      at: win.record.endAt!,
      matchId: null,
    });
  }
  const unbeaten = bestOf((s) => s.bestUnbeaten);
  if (unbeaten && unbeaten.record.value >= 2) {
    players.push({
      kind: "unbeaten-streak",
      title: "Más partidos sin perder",
      playerId: unbeaten.id,
      value: unbeaten.record.value,
      display: plural(unbeaten.record.value, "partido", "partidos"),
      at: unbeaten.record.endAt!,
      matchId: null,
    });
  }
  const attendance = bestOf((s) => s.bestAttendance);
  if (attendance && attendance.record.value >= 2) {
    players.push({
      kind: "attendance-streak",
      title: "Más partidos seguidos",
      playerId: attendance.id,
      value: attendance.record.value,
      display: plural(attendance.record.value, "partido", "partidos"),
      at: attendance.record.endAt!,
      matchId: null,
    });
  }

  if (biggest) {
    matchRecords.push({
      kind: "biggest-win",
      title: "Mayor goleada",
      matchId: biggest.matchId,
      at: biggest.scheduledAt,
      score: { ...biggest.score },
      display: `${biggest.score.a}–${biggest.score.b}`,
    });
  }
  if (mostGoals) {
    const total = mostGoals.score.a + mostGoals.score.b;
    matchRecords.push({
      kind: "most-goals",
      title: "Partido con más goles",
      matchId: mostGoals.matchId,
      at: mostGoals.scheduledAt,
      score: { ...mostGoals.score },
      display: `${mostGoals.score.a}–${mostGoals.score.b} · ${plural(total, "gol", "goles")}`,
    });
  }
  return { players, matches: matchRecords };
}
