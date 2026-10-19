import "server-only";
import { cache } from "react";
import { type Position, toPlayerPositions } from "@/domain/players/positions";
import {
  buildRankings,
  computeRatings,
  confidenceFor,
  ENGINE_VERSION,
  type PlayerProfile,
  type PlayerTotals,
  type RankingKind,
  type RankingList,
  type RatingAggregate,
  type RatingResult,
} from "@/domain/rating";
import { type PredictionAccuracy, predictionAccuracy, preMatchSkills } from "@/domain/predictions/accuracy";
import {
  type AttendanceEntry,
  attendanceTop,
  type GoalsPoint,
  goalsTrend,
  type ResultDistribution,
  resultDistribution,
} from "@/domain/stats/analytics";
import { buildRatingInput, type MatchLineRow } from "@/domain/stats/engine-input";
import { linesInRange } from "@/domain/stats/match-summaries";
import { type DuoRecord, duoRanking, findRivalries, RIVALRY_MIN_MATCHES, type Rivalries } from "@/domain/stats/rivalries";
import { evolutionSeries, type EvolutionPoint } from "@/domain/stats/evolution";
import { EMPTY_HEAD_TO_HEAD, type HeadToHead } from "@/domain/stats/head-to-head";
import { averageRating, scorersText, tallyScorers } from "@/domain/stats/history";
import { displayRating, recentLines } from "@/domain/stats/player-lines";
import { ALL_TIME, type DateRange, rangeToInstants, type SeasonLike, seasonRange } from "@/domain/stats/seasons";
import { createClient } from "@/lib/supabase/server";

/*
 * DAL de estadísticas. El motor de valoración corre en el servidor al leer
 * (D-025): se cargan los hechos del grupo una vez por request (React cache)
 * y se calcula la valoración para el rango pedido.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** max-rows de PostgREST en Supabase: se pagina para no truncar en silencio. */
const PAGE = 1000;
const MAX_ROWS = 100_000;

async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export interface RosterEntry {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  baseRating: number;
  isActive: boolean;
  primaryPosition: Position | null;
}

export interface AggregateRow extends RatingAggregate {
  rawAverage: number | null;
}

export interface GroupHistory {
  timeZone: string;
  roster: RosterEntry[];
  players: PlayerProfile[];
  lines: MatchLineRow[];
  aggregates: AggregateRow[];
}

const toNumber = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

/** Hechos del grupo para el motor: plantel, líneas por partido y votos cerrados. */
export const loadGroupHistory = cache(async (groupId: string): Promise<GroupHistory> => {
  const supabase = await createClient();
  const [group, players, lines, aggregates] = await Promise.all([
    supabase.from("groups").select("timezone").eq("id", groupId).maybeSingle(),
    supabase
      .from("players")
      .select("id, nickname, avatar_url, base_rating, is_active, profile_id, player_positions(position, priority)")
      .eq("group_id", groupId)
      .order("nickname"),
    fetchAll((from, to) =>
      supabase
        .from("player_match_lines")
        .select("match_id, player_id, side, scheduled_at, goals_for, goals_against, goals, assists, own_goals, is_mvp")
        .eq("group_id", groupId)
        .order("scheduled_at")
        .order("match_id")
        .order("player_id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.rpc("get_rating_aggregates", { p_group_id: groupId }).order("match_id").order("player_id").range(from, to),
    ),
  ]);
  if (group.error) throw group.error;
  if (players.error) throw players.error;

  const profileIds = players.data.map((p) => p.profile_id).filter((id): id is string => Boolean(id));
  const avatars = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", profileIds);
    for (const p of data ?? []) avatars.set(p.id, p.avatar_url);
  }

  const roster: RosterEntry[] = players.data.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatar_url ?? (p.profile_id ? (avatars.get(p.profile_id) ?? null) : null),
    baseRating: Number(p.base_rating),
    isActive: p.is_active,
    primaryPosition: toPlayerPositions(p.player_positions).primary,
  }));

  return {
    timeZone: group.data?.timezone ?? "America/Argentina/Buenos_Aires",
    roster,
    players: roster.map((p) => ({ id: p.id, baseRating: p.baseRating, primaryPosition: p.primaryPosition })),
    lines: lines.flatMap((l) =>
      l.match_id && l.player_id && l.side && l.scheduled_at && l.goals_for !== null && l.goals_against !== null
        ? [
            {
              matchId: l.match_id,
              playerId: l.player_id,
              side: l.side,
              scheduledAt: l.scheduled_at,
              goalsFor: l.goals_for,
              goalsAgainst: l.goals_against,
              goals: l.goals ?? 0,
              assists: l.assists ?? 0,
              ownGoals: l.own_goals ?? 0,
              isMvp: l.is_mvp ?? false,
            },
          ]
        : [],
    ),
    aggregates: aggregates.flatMap((a) =>
      a.match_id && a.player_id
        ? [
            {
              matchId: a.match_id,
              playerId: a.player_id,
              votes: a.votes ?? 0,
              adjustedAverage: toNumber(a.adjusted_average),
              rawAverage: toNumber(a.raw_average),
            },
          ]
        : [],
    ),
  };
});

const ratingsFor = cache(async (groupId: string, from: string | null, to: string | null): Promise<RatingResult> => {
  const history = await loadGroupHistory(groupId);
  return computeRatings(buildRatingInput(history, { range: { from, to }, timeZone: history.timeZone }));
});

/**
 * Valoración del grupo calculada por el motor (opcionalmente solo con los
 * partidos de un rango de fechas locales). Memoizada por request.
 */
export function getGroupRatings(groupId: string, range: Partial<DateRange> = {}): Promise<RatingResult> {
  return ratingsFor(groupId, range.from ?? null, range.to ?? null);
}

export interface SkillInfo {
  rating: number;
  isProvisional: boolean;
}

/** Valoración visible por jugador: la del motor (histórico completo) o el nivel inicial. */
export async function getDisplayRatings(groupId: string): Promise<(id: string, baseRating: number) => SkillInfo> {
  const result = await getGroupRatings(groupId);
  return (id, baseRating) => displayRating(baseRating, result.byPlayer[id]);
}

const totalsFor = cache(async (groupId: string, from: string | null, to: string | null): Promise<Map<string, PlayerTotals>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_player_stats", {
    p_group_id: groupId,
    ...(from ? { p_from: from } : {}),
    ...(to ? { p_to: to } : {}),
  });
  if (error) throw error;
  const map = new Map<string, PlayerTotals>();
  for (const row of data) {
    if (!row.player_id) continue;
    map.set(row.player_id, {
      playerId: row.player_id,
      matches: row.matches ?? 0,
      wins: row.wins ?? 0,
      draws: row.draws ?? 0,
      losses: row.losses ?? 0,
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      mvps: row.mvps ?? 0,
    });
  }
  return map;
});

export const EMPTY_TOTALS: Omit<PlayerTotals, "playerId"> = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, mvps: 0 };

/** Totales de un jugador (`get_player_stats`), opcionalmente en un rango. */
export async function getPlayerStatsSummary(
  groupId: string,
  playerId: string,
  range: Partial<DateRange> = {},
): Promise<PlayerTotals> {
  const totals = await totalsFor(groupId, range.from ?? null, range.to ?? null);
  return totals.get(playerId) ?? { playerId, ...EMPTY_TOTALS };
}

/* ---------- Temporadas ---------- */

export const listSeasonsForStats = cache(async (groupId: string): Promise<SeasonLike[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, starts_on, ends_on")
    .eq("group_id", groupId)
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return data;
});

/* ---------- Rankings ---------- */

export interface RankingsData {
  rankings: Record<RankingKind, RankingList>;
  players: Record<string, Pick<RosterEntry, "id" | "nickname" | "avatarUrl" | "primaryPosition" | "isActive">>;
  range: DateRange;
  /** Partidos con resultado en el rango. */
  matchCount: number;
}

/** Los 8 rankings del grupo para una temporada (null = histórico) y un mínimo de partidos. */
export async function getRankings(groupId: string, seasonId: string | null, minMatches: number): Promise<RankingsData> {
  const seasons = seasonId ? await listSeasonsForStats(groupId) : [];
  const season = seasonId ? (seasons.find((s) => s.id === seasonId) ?? null) : null;
  const range = season ? seasonRange(season) : ALL_TIME;

  const [history, result, totals] = await Promise.all([
    loadGroupHistory(groupId),
    getGroupRatings(groupId, range),
    totalsFor(groupId, range.from, range.to),
  ]);

  const rankings = buildRankings(result, [...totals.values()], { minMatches });
  const players: RankingsData["players"] = {};
  for (const p of history.roster) {
    players[p.id] = { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl, primaryPosition: p.primaryPosition, isActive: p.isActive };
  }
  const matchIds = new Set<string>();
  for (const id of Object.keys(result.byPlayer)) for (const h of result.byPlayer[id].history) matchIds.add(h.matchId);
  return { rankings, players, range, matchCount: matchIds.size };
}

/* ---------- Ficha ---------- */

/** Serie del gráfico "Evolución" (histórico completo, zona del grupo). */
export async function getPlayerEvolution(groupId: string, playerId: string): Promise<EvolutionPoint[]> {
  const [history, result] = await Promise.all([loadGroupHistory(groupId), getGroupRatings(groupId)]);
  return evolutionSeries(result.byPlayer[playerId]?.history ?? [], history.timeZone);
}

export interface RecentMatch {
  matchId: string;
  scheduledAt: string;
  goalsFor: number;
  goalsAgainst: number;
  goals: number;
  assists: number;
  isMvp: boolean;
  /** Rendimiento P (votación cerrada); null sin votos. */
  performance: number | null;
}

/** Últimos partidos del jugador con su rendimiento. */
export async function getRecentMatches(groupId: string, playerId: string, n = 5): Promise<RecentMatch[]> {
  const [history, result] = await Promise.all([loadGroupHistory(groupId), getGroupRatings(groupId)]);
  return recentLines(history.lines, playerId, n).map((l) => ({
    matchId: l.matchId,
    scheduledAt: l.scheduledAt,
    goalsFor: l.goalsFor,
    goalsAgainst: l.goalsAgainst,
    goals: l.goals,
    assists: l.assists,
    isMvp: l.isMvp,
    performance: result.byMatch[l.matchId]?.performances[playerId] ?? null,
  }));
}

/** Cara a cara entre dos jugadores (`get_head_to_head`, desde el punto de vista de A). */
export async function getHeadToHead(groupId: string, playerA: string, playerB: string): Promise<HeadToHead> {
  if (!UUID.test(playerA) || !UUID.test(playerB) || playerA === playerB) return EMPTY_HEAD_TO_HEAD;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_head_to_head", { p_group_id: groupId, p_player_a: playerA, p_player_b: playerB });
  if (error) throw error;
  const row = data[0];
  if (!row) return EMPTY_HEAD_TO_HEAD;
  return {
    togetherMatches: row.together_matches ?? 0,
    togetherWins: row.together_wins ?? 0,
    togetherDraws: row.together_draws ?? 0,
    togetherLosses: row.together_losses ?? 0,
    againstMatches: row.against_matches ?? 0,
    aWins: row.a_wins ?? 0,
    bWins: row.b_wins ?? 0,
    draws: row.draws ?? 0,
  };
}

/* ---------- Calificaciones de un partido ---------- */

export interface MatchRatingRow {
  playerId: string;
  votes: number;
  adjustedAverage: number | null;
  rawAverage: number | null;
}

/** Calificaciones publicadas de un partido (vacío mientras la votación siga abierta). */
export async function getMatchRatings(groupId: string, matchId: string): Promise<MatchRatingRow[]> {
  if (!UUID.test(matchId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_rating_aggregates", { p_group_id: groupId, p_match_id: matchId });
  if (error) throw error;
  return data
    .flatMap((a) =>
      a.player_id
        ? [{ playerId: a.player_id, votes: a.votes ?? 0, adjustedAverage: toNumber(a.adjusted_average), rawAverage: toNumber(a.raw_average) }]
        : [],
    )
    .sort((x, y) => (y.adjustedAverage ?? -1) - (x.adjustedAverage ?? -1) || y.votes - x.votes);
}

/* ---------- Historial ---------- */

export interface HistoryMatch {
  id: string;
  scheduledAt: string;
  venue: string | null;
  teams: { a: { name: string; score: number | null }; b: { name: string; score: number | null } };
  scorers: string;
  mvp: { id: string; nickname: string } | null;
  averageRating: number | null;
}

export interface HistoryPage {
  items: HistoryMatch[];
  total: number;
}

/** Partidos jugados del grupo (del más reciente al más viejo), opcionalmente en un rango. */
export async function listMatchHistory(groupId: string, options: { range: DateRange; limit: number }): Promise<HistoryPage> {
  const supabase = await createClient();
  const history = await loadGroupHistory(groupId);
  const { fromIso, toIsoExclusive } = rangeToInstants(options.range, history.timeZone);

  let query = supabase
    .from("matches")
    .select("id, scheduled_at, venue, mvp_player_id", { count: "exact" })
    .eq("group_id", groupId)
    .eq("status", "finished");
  if (fromIso) query = query.gte("scheduled_at", fromIso);
  if (toIsoExclusive) query = query.lt("scheduled_at", toIsoExclusive);
  const { data, error, count } = await query
    .order("scheduled_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, Math.max(0, options.limit - 1));
  if (error) throw error;
  if (data.length === 0) return { items: [], total: count ?? 0 };

  const ids = data.map((m) => m.id);
  const [teams, goals] = await Promise.all([
    supabase.from("teams").select("match_id, side, name, score").in("match_id", ids),
    supabase.from("match_events").select("match_id, player_id").in("match_id", ids).eq("event_type", "goal"),
  ]);
  if (teams.error) throw teams.error;
  if (goals.error) throw goals.error;

  const names = new Map(history.roster.map((p) => [p.id, p.nickname]));
  const nameOf = (id: string) => names.get(id) ?? "—";
  const teamMap = new Map<string, HistoryMatch["teams"]>();
  for (const t of teams.data) {
    const entry = teamMap.get(t.match_id) ?? { a: { name: "Azul", score: null }, b: { name: "Rojo", score: null } };
    entry[t.side] = { name: t.name, score: t.score };
    teamMap.set(t.match_id, entry);
  }
  const goalsByMatch = new Map<string, Array<{ playerId: string | null }>>();
  for (const g of goals.data) goalsByMatch.set(g.match_id, [...(goalsByMatch.get(g.match_id) ?? []), { playerId: g.player_id }]);
  const avgByMatch = new Map<string, Array<number | null>>();
  for (const a of history.aggregates) avgByMatch.set(a.matchId, [...(avgByMatch.get(a.matchId) ?? []), a.adjustedAverage]);

  return {
    total: count ?? data.length,
    items: data.map((m) => ({
      id: m.id,
      scheduledAt: m.scheduled_at,
      venue: m.venue,
      teams: teamMap.get(m.id) ?? { a: { name: "Azul", score: null }, b: { name: "Rojo", score: null } },
      scorers: scorersText(tallyScorers(goalsByMatch.get(m.id) ?? [], nameOf), nameOf),
      mvp: m.mvp_player_id ? { id: m.mvp_player_id, nickname: nameOf(m.mvp_player_id) } : null,
      averageRating: averageRating(avgByMatch.get(m.id) ?? []),
    })),
  };
}

/* ---------- Caché del motor (best-effort) ---------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Persiste la historia de valoraciones en `player_skill_history` si cambió
 * (D-026). Es una caché reconstruible: nunca rompe la lectura si falla.
 */
export async function syncSkillHistory(groupId: string): Promise<void> {
  try {
    const result = await getGroupRatings(groupId);
    const rows: Array<{ player_id: string; match_id: string; skill: number; confidence: number; performance: number | null }> = [];
    for (const [playerId, rating] of Object.entries(result.byPlayer)) {
      rating.history.forEach((point, index) => {
        rows.push({
          player_id: playerId,
          match_id: point.matchId,
          skill: round2(point.skill),
          confidence: Math.round(confidenceFor(index + 1) * 1000) / 1000,
          performance: point.performance === null ? null : round2(point.performance),
        });
      });
    }
    if (rows.length > 5000) return;

    const supabase = await createClient();
    const stored = await fetchAll((from, to) =>
      supabase
        .from("player_skill_history")
        .select("player_id, match_id, skill, performance")
        .eq("group_id", groupId)
        .eq("engine_version", ENGINE_VERSION)
        .order("player_id")
        .order("match_id")
        .range(from, to),
    );
    const key = (r: { player_id: string; match_id: string; skill: number | string; performance: number | string | null }) =>
      `${r.player_id}:${r.match_id}:${Number(r.skill).toFixed(2)}:${r.performance === null ? "-" : Number(r.performance).toFixed(2)}`;
    const storedKeys = new Set(stored.map(key));
    const same = stored.length === rows.length && rows.every((r) => storedKeys.has(key(r)));
    if (same) return;

    await supabase.rpc("replace_skill_history", { p_group_id: groupId, p_engine_version: ENGINE_VERSION, p_rows: rows });
  } catch {
    // Caché opcional: la valoración se recalcula igual en cada lectura.
  }
}

/* ---------- Rivalidades, análisis y pronóstico (D-037, D-038, D-040) ---------- */

/** Socio ideal, rival favorito y némesis de un jugador (histórico completo). */
export async function getPlayerRivalries(groupId: string, playerId: string, minMatches = RIVALRY_MIN_MATCHES): Promise<Rivalries> {
  const history = await loadGroupHistory(groupId);
  return findRivalries(history.lines, playerId, minMatches);
}

export interface GroupInsights {
  range: DateRange;
  trend: GoalsPoint[];
  distribution: ResultDistribution;
  attendance: AttendanceEntry[];
  duos: DuoRecord[];
  accuracy: PredictionAccuracy;
  players: Record<string, { nickname: string; avatarUrl: string | null }>;
}

/**
 * Análisis del grupo en un rango de fechas locales (temporada). El pronóstico
 * usa la habilidad previa a cada partido del motor con el histórico completo,
 * así el primer partido de una temporada no arranca de cero.
 */
export async function getGroupInsights(groupId: string, range: DateRange, options: { duoMinMatches: number }): Promise<GroupInsights> {
  const [history, result] = await Promise.all([loadGroupHistory(groupId), getGroupRatings(groupId)]);
  const lines = linesInRange(history.lines, range, history.timeZone);
  const players: GroupInsights["players"] = {};
  for (const p of history.roster) players[p.id] = { nickname: p.nickname, avatarUrl: p.avatarUrl };
  return {
    range,
    trend: goalsTrend(lines, history.timeZone, { window: 5, limit: 30 }),
    distribution: resultDistribution(lines),
    attendance: attendanceTop(lines, 8),
    duos: duoRanking(lines, { minMatches: Math.max(1, options.duoMinMatches), limit: 8 }),
    accuracy: predictionAccuracy(lines, preMatchSkills(result, history.players)),
    players,
  };
}
