/**
 * Cálculo de premios y logros a partir del historial de partidos
 * (`player_match_lines`), las calificaciones del motor y los campeones de
 * temporada. Puro y determinista: "hoy" llega por parámetro.
 */

import { isoToZoned } from "@/domain/matches/datetime";
import { buildRankings, formatDecimal, type RatingPosition, type RatingResult } from "@/domain/rating";
import type { MatchLineRow } from "@/domain/stats/engine-input";
import { monthLabel } from "@/domain/stats/history";
import { compareChronological, sideResult, summarizeMatches } from "@/domain/stats/match-summaries";
import { type DateRange, instantInRange } from "@/domain/stats/seasons";
import { type Award, type AwardIcon, type AwardKind, type AwardTier, TIER_RANK } from "./types";

export interface Milestone {
  n: number;
  tier: AwardTier;
}

/** Partidos jugados con el grupo. */
export const MATCH_MILESTONES: readonly Milestone[] = [
  { n: 10, tier: "bronze" },
  { n: 25, tier: "silver" },
  { n: 50, tier: "gold" },
  { n: 100, tier: "gold" },
];
/** Veces elegido MVP. */
export const MVP_MILESTONES: readonly Milestone[] = [
  { n: 1, tier: "bronze" },
  { n: 5, tier: "silver" },
  { n: 10, tier: "gold" },
];
/** Victorias seguidas. */
export const WIN_STREAKS: readonly Milestone[] = [
  { n: 3, tier: "bronze" },
  { n: 5, tier: "silver" },
];
/** Partidos seguidos sin perder. */
export const UNBEATEN_STREAK: Milestone = { n: 5, tier: "silver" };
/** Partidos seguidos del grupo sin faltar. */
export const ATTENDANCE_STREAKS: readonly Milestone[] = [
  { n: 5, tier: "bronze" },
  { n: 10, tier: "silver" },
  { n: 20, tier: "gold" },
];

const CLEAN_SHEET_POSITIONS: ReadonlySet<RatingPosition> = new Set(["goalkeeper", "defender"]);

export interface SeasonChampion {
  seasonId: string;
  seasonName: string;
  range: DateRange;
  playerId: string;
  /** Valor ya formateado ("7,8"). */
  display: string;
}

export interface AwardsInput {
  lines: readonly MatchLineRow[];
  timeZone: string;
  /** Posición principal por jugador (para "Valla invicta"). */
  positions?: Readonly<Record<string, RatingPosition | null | undefined>>;
  /**
   * Fecha local de hoy (YYYY-MM-DD). Cierra los meses anteriores al actual;
   * sin ella, un mes se cierra cuando hay un partido en un mes posterior.
   */
  today?: string | null;
  /** Rendimiento P por partido y jugador (`RatingResult.byMatch`), para desempatar el MVP del mes. */
  performances?: Readonly<Record<string, { performances: Readonly<Record<string, number>> }>>;
  /** Mejor promedio de cada temporada ya terminada. */
  seasonChampions?: readonly SeasonChampion[];
  /**
   * Fecha (ISO) de los partidos jugados con la votación todavía abierta. Su
   * mes no se cierra hasta que voten: el MVP y los promedios pueden cambiar.
   */
  openVotingAt?: readonly string[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function make(
  kind: AwardKind,
  playerId: string,
  context: string,
  fields: { title: string; description: string; icon: AwardIcon; tier: AwardTier; earnedAt: string; matchId: string | null },
): Award {
  return { id: `${kind}:${playerId}:${context}`, kind, playerId, ...fields };
}

interface StreakState {
  matches: number;
  mvps: number;
  wins: number;
  unbeaten: number;
  attendance: number;
}

/** Todos los logros del grupo, del más reciente al más viejo (a igual fecha, primero los de oro). */
export function computeAwards(input: AwardsInput): Award[] {
  const matches = summarizeMatches(input.lines);
  const awards: Award[] = [];
  const state = new Map<string, StreakState>();
  const stateOf = (id: string) => {
    let st = state.get(id);
    if (!st) {
      st = { matches: 0, mvps: 0, wins: 0, unbeaten: 0, attendance: 0 };
      state.set(id, st);
    }
    return st;
  };

  for (const match of matches) {
    const at = match.scheduledAt;
    const matchId = match.matchId;
    const players = [...match.lines.keys()].sort();
    const present = new Set(players);

    // Asistencia: quien ya jugó alguna vez y faltó corta su racha.
    for (const [id, st] of state) if (!present.has(id)) st.attendance = 0;

    for (const id of players) {
      const line = match.lines.get(id)!;
      const st = stateOf(id);
      const result = sideResult(match, line.side);
      const base = { earnedAt: at, matchId };

      st.matches += 1;
      if (st.matches === 1) {
        awards.push(
          make("debut", id, matchId, { ...base, title: "Debut", description: "Primer partido con el grupo", icon: "Footprints", tier: "bronze" }),
        );
      }
      for (const m of MATCH_MILESTONES) {
        if (st.matches === m.n) {
          awards.push(
            make("matches", id, String(m.n), {
              ...base,
              title: `${m.n} partidos`,
              description: `Jugó ${m.n} partidos con el grupo`,
              icon: "Medal",
              tier: m.tier,
            }),
          );
        }
      }

      if (line.goals >= 3) {
        awards.push(
          make("hat-trick", id, matchId, {
            ...base,
            title: "Hat-trick",
            description: `${line.goals} goles en un partido`,
            icon: "Flame",
            tier: "gold",
          }),
        );
      } else if (line.goals === 2) {
        awards.push(make("brace", id, matchId, { ...base, title: "Doblete", description: "2 goles en un partido", icon: "Goal", tier: "bronze" }));
      }
      // Sin premio por asistencias: ya no se cargan (D-060).

      if (line.isMvp) {
        st.mvps += 1;
        for (const m of MVP_MILESTONES) {
          if (st.mvps === m.n) {
            awards.push(
              make("mvp", id, String(m.n), {
                ...base,
                title: m.n === 1 ? "Primer MVP" : `${m.n} veces MVP`,
                description: m.n === 1 ? "Elegido el mejor del partido" : `Elegido el mejor del partido ${m.n} veces`,
                icon: "Star",
                tier: m.tier,
              }),
            );
          }
        }
      }

      if (match.score[line.side === "a" ? "b" : "a"] === 0 && CLEAN_SHEET_POSITIONS.has(input.positions?.[id] as RatingPosition)) {
        awards.push(
          make("clean-sheet", id, matchId, {
            ...base,
            title: "Valla invicta",
            description: "Su equipo no recibió goles",
            icon: "BrickWall",
            tier: "bronze",
          }),
        );
      }

      st.wins = result === "win" ? st.wins + 1 : 0;
      st.unbeaten = result === "loss" ? 0 : st.unbeaten + 1;
      st.attendance += 1;
      for (const m of WIN_STREAKS) {
        if (st.wins === m.n) {
          awards.push(
            make("win-streak", id, `${matchId}:${m.n}`, {
              ...base,
              title: m.n >= 5 ? "Racha imparable" : "Racha ganadora",
              description: `${m.n} victorias seguidas`,
              icon: "Zap",
              tier: m.tier,
            }),
          );
        }
      }
      if (st.unbeaten === UNBEATEN_STREAK.n) {
        awards.push(
          make("unbeaten", id, matchId, {
            ...base,
            title: "Invicto",
            description: `${UNBEATEN_STREAK.n} partidos seguidos sin perder`,
            icon: "ShieldCheck",
            tier: UNBEATEN_STREAK.tier,
          }),
        );
      }
      for (const m of ATTENDANCE_STREAKS) {
        if (st.attendance === m.n) {
          awards.push(
            make("attendance", id, `${matchId}:${m.n}`, {
              ...base,
              title: "Siempre presente",
              description: `${m.n} partidos seguidos sin faltar`,
              icon: "CalendarCheck",
              tier: m.tier,
            }),
          );
        }
      }
    }
  }

  awards.push(...monthAwardsToList(monthlyAwards(input)));
  awards.push(...seasonAwards(input));
  return sortAwards(awards);
}

export function sortAwards(awards: readonly Award[]): Award[] {
  return [...awards].sort(
    (x, y) =>
      compareChronological({ scheduledAt: y.earnedAt, matchId: "" }, { scheduledAt: x.earnedAt, matchId: "" }) ||
      TIER_RANK[y.tier] - TIER_RANK[x.tier] ||
      (x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
  );
}

/* ---------- Premios del mes ---------- */

export interface MonthWinner {
  playerId: string;
  value: number;
}

export interface MonthAwards {
  /** "2026-10". */
  key: string;
  /** "Octubre 2026". */
  label: string;
  /** ISO del último partido del mes. */
  lastMatchAt: string;
  matches: number;
  /** Goleadores (más de uno si empataron); vacío si nadie hizo goles. */
  scorers: MonthWinner[];
  /** MVP del mes: más veces MVP, desempate por promedio de calificación. */
  mvps: MonthWinner[];
}

const monthKeyOf = (iso: string, timeZone: string) => isoToZoned(iso, timeZone).date.slice(0, 7);

function leaders(values: Map<string, number>, tiebreak?: Map<string, number>): MonthWinner[] {
  let best = 0;
  for (const v of values.values()) best = Math.max(best, v);
  if (best <= 0) return [];
  let tied = [...values.entries()].filter(([, v]) => v === best).map(([playerId]) => playerId);
  if (tied.length > 1 && tiebreak) {
    const scores = tied.map((id) => tiebreak.get(id) ?? Number.NEGATIVE_INFINITY);
    const top = Math.max(...scores);
    if (Number.isFinite(top)) tied = tied.filter((_, i) => scores[i] === top);
  }
  return tied.sort().map((playerId) => ({ playerId, value: best }));
}

/**
 * Goleador y MVP de cada mes ya cerrado, del más reciente al más viejo. Un mes
 * está cerrado cuando terminó y ninguno de sus partidos tiene la votación abierta.
 */
export function monthlyAwards(input: AwardsInput): MonthAwards[] {
  const matches = summarizeMatches(input.lines);
  if (matches.length === 0) return [];
  const lastMonth = monthKeyOf(matches[matches.length - 1].scheduledAt, input.timeZone);
  const todayMonth = input.today ? input.today.slice(0, 7) : null;
  const pending = new Set((input.openVotingAt ?? []).map((iso) => monthKeyOf(iso, input.timeZone)));
  const isClosed = (key: string) => !pending.has(key) && (key < lastMonth || (todayMonth !== null && key < todayMonth));

  const months = new Map<string, { lastMatchAt: string; matches: number; goals: Map<string, number>; mvps: Map<string, number>; perf: Map<string, number[]> }>();
  for (const match of matches) {
    const key = monthKeyOf(match.scheduledAt, input.timeZone);
    let month = months.get(key);
    if (!month) {
      month = { lastMatchAt: match.scheduledAt, matches: 0, goals: new Map(), mvps: new Map(), perf: new Map() };
      months.set(key, month);
    }
    month.lastMatchAt = match.scheduledAt;
    month.matches += 1;
    const perfs = input.performances?.[match.matchId]?.performances ?? {};
    for (const [id, line] of match.lines) {
      if (line.goals > 0) month.goals.set(id, (month.goals.get(id) ?? 0) + line.goals);
      if (line.isMvp) month.mvps.set(id, (month.mvps.get(id) ?? 0) + 1);
      const p = perfs[id];
      if (typeof p === "number" && Number.isFinite(p)) month.perf.set(id, [...(month.perf.get(id) ?? []), p]);
    }
  }

  const out: MonthAwards[] = [];
  for (const [key, month] of months) {
    if (!isClosed(key)) continue;
    const avgPerf = new Map([...month.perf.entries()].map(([id, list]) => [id, list.reduce((s, v) => s + v, 0) / list.length]));
    out.push({
      key,
      label: monthLabel(key),
      lastMatchAt: month.lastMatchAt,
      matches: month.matches,
      scorers: leaders(month.goals),
      mvps: leaders(month.mvps, avgPerf),
    });
  }
  return out.sort((x, y) => (x.key < y.key ? 1 : x.key > y.key ? -1 : 0));
}

function monthAwardsToList(months: readonly MonthAwards[]): Award[] {
  const list: Award[] = [];
  for (const month of months) {
    const shared = (winners: MonthWinner[]) => (winners.length > 1 ? " (compartido)" : "");
    for (const w of month.scorers) {
      list.push(
        make("month-scorer", w.playerId, month.key, {
          title: "Goleador del mes",
          description: `${month.label} · ${plural(w.value, "gol", "goles")}${shared(month.scorers)}`,
          icon: "Crown",
          tier: "gold",
          earnedAt: month.lastMatchAt,
          matchId: null,
        }),
      );
    }
    for (const w of month.mvps) {
      list.push(
        make("month-mvp", w.playerId, month.key, {
          title: "MVP del mes",
          description: `${month.label} · ${w.value} ${w.value === 1 ? "vez" : "veces"} MVP${shared(month.mvps)}`,
          icon: "Star",
          tier: "gold",
          earnedAt: month.lastMatchAt,
          matchId: null,
        }),
      );
    }
  }
  return list;
}

/* ---------- Temporada ---------- */

function seasonAwards(input: AwardsInput): Award[] {
  const list: Award[] = [];
  for (const champion of input.seasonChampions ?? []) {
    const inSeason = input.lines.filter((l) => instantInRange(l.scheduledAt, champion.range, input.timeZone));
    if (inSeason.length === 0) continue;
    const last = inSeason.reduce((acc, l) => (compareChronological(l, acc) > 0 ? l : acc));
    list.push(
      make("season-best", champion.playerId, champion.seasonId, {
        title: "Mejor promedio",
        description: `Temporada ${champion.seasonName} · ${champion.display}`,
        icon: "Trophy",
        tier: "gold",
        earnedAt: last.scheduledAt,
        matchId: null,
      }),
    );
  }
  return list;
}

/** Formato del valor del campeón de temporada (promedio de calificaciones). */
export const formatSeasonValue = (value: number) => formatDecimal(value);

/**
 * Mejor promedio de una temporada: el primero de "Mejor promedio" del motor
 * (con el mínimo de partidos con votos del grupo). null si nadie llega.
 */
export function pickSeasonChampion(
  result: Pick<RatingResult, "byPlayer" | "byMatch" | "engineVersion">,
  minMatches: number,
): { playerId: string; value: number; display: string } | null {
  const top = buildRankings(result, [], { minMatches }).bestAverage.entries[0];
  return top ? { playerId: top.playerId, value: top.value, display: top.display } : null;
}
