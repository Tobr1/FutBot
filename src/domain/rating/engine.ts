/**
 * Motor de valoración v1 (docs/ANALISIS.md §6). Puro y determinista: repite
 * el historial en orden cronológico y devuelve la habilidad estimada S de
 * cada jugador, su incertidumbre y el rendimiento P de cada partido.
 */

import { clampRating } from "@/domain/players/rating";
import { ENGINE_VERSION, resolveRatingConfig, type RatingConfig, type RatingConfigOverrides } from "./config";
import type {
  MatchHistory,
  MatchRating,
  PlayerHistoryPoint,
  PlayerLine,
  PlayerRating,
  RatingAggregate,
  RatingInput,
  RatingPosition,
  RatingResult,
} from "./types";

/** Esperado tipo Elo de un equipo con valoración `own` contra uno con `opponent`. */
export function eloExpected(own: number, opponent: number, scale: number): number {
  return 1 / (1 + Math.pow(10, (opponent - own) / scale));
}

/** Paso adaptativo α_n = max(α_min, 1 / (n + n₀)), con n = partidos con votos (incluido el actual). */
export function voteAlpha(n: number, config: Pick<RatingConfig, "votes"> = resolveRatingConfig()): number {
  return Math.max(config.votes.alphaMin, 1 / (n + config.votes.n0));
}

/** Confianza c = 1 − e^(−n/τ). */
export function confidenceFor(matches: number, config: Pick<RatingConfig, "confidence"> = resolveRatingConfig()): number {
  return 1 - Math.exp(-Math.max(0, matches) / config.confidence.tau);
}

/** Incertidumbre σ: interpola entre σ₀ (sin partidos) y σ_min (confianza plena). */
export function sigmaFor(confidence: number, config: Pick<RatingConfig, "uncertainty"> = resolveRatingConfig()): number {
  const { sigma0, sigmaMin } = config.uncertainty;
  return sigmaMin + (sigma0 - sigmaMin) * (1 - confidence);
}

/** Contracción bayesiana P = (k·μ + n·x̄) / (k + n). */
export function shrinkPerformance(average: number, votes: number, matchMean: number, k: number): number {
  return clampRating((k * matchMean + votes * average) / (k + votes));
}

interface PlayerState {
  id: string;
  prior: number;
  position: RatingPosition | null;
  sv: number;
  sr: number;
  so: number;
  offenseSum: number;
  matches: number;
  resultMatches: number;
  votedMatches: number;
  history: PlayerHistoryPoint[];
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

function mean(values: readonly number[]): number | null {
  return values.length > 0 ? sum(values) / values.length : null;
}

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function compareMatches(x: MatchHistory, y: MatchHistory): number {
  const tx = Date.parse(x.playedAt);
  const ty = Date.parse(y.playedAt);
  if (Number.isFinite(tx) && Number.isFinite(ty) && tx !== ty) return tx - ty;
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    const byText = compareIds(x.playedAt, y.playedAt);
    if (byText !== 0) return byText;
  }
  return compareIds(x.matchId, y.matchId);
}

const keyOf = (matchId: string, playerId: string) => `${matchId}\u0000${playerId}`;

function combinedSkill(st: PlayerState, w: RatingConfig["weights"]): number {
  let num = 0;
  let den = 0;
  if (st.votedMatches > 0 && w.votes > 0) {
    num += w.votes * st.sv;
    den += w.votes;
  }
  if (st.resultMatches > 0 && w.results > 0) {
    num += w.results * st.sr;
    den += w.results;
  }
  if (st.matches > 0 && w.offense > 0) {
    num += w.offense * st.so;
    den += w.offense;
  }
  return den > 0 ? clampRating(num / den) : st.prior;
}

function populationStdDev(values: readonly number[]): number {
  const m = sum(values) / values.length;
  return Math.sqrt(sum(values.map((v) => (v - m) ** 2)) / values.length);
}

/**
 * Calcula la valoración de todos los jugadores a partir del historial.
 * El orden de las entradas no importa: los partidos se ordenan por fecha y
 * luego por id, y todas las sumas se hacen en orden de id.
 */
export function computeRatings(input: RatingInput, overrides?: RatingConfigOverrides): RatingResult {
  const config = resolveRatingConfig(overrides);
  const { weights } = config;

  // --- Estado inicial -------------------------------------------------------
  const players = [...input.players].sort((a, b) => compareIds(a.id, b.id));
  const bases = players.map((p) => p.baseRating).filter(isFiniteNumber);
  const groupMean = clampRating(mean(bases) ?? config.defaultRating);

  const states = new Map<string, PlayerState>();
  const ensure = (id: string, base: number | null = null, position: RatingPosition | null = null) => {
    let st = states.get(id);
    if (!st) {
      const prior = isFiniteNumber(base) ? clampRating(base) : groupMean;
      st = {
        id,
        prior,
        position,
        sv: prior,
        sr: prior,
        so: prior,
        offenseSum: 0,
        matches: 0,
        resultMatches: 0,
        votedMatches: 0,
        history: [],
      };
      states.set(id, st);
    }
    return st;
  };
  for (const p of players) ensure(p.id, p.baseRating, p.primaryPosition);

  // --- Índices ----------------------------------------------------------------
  const lineByKey = new Map<string, PlayerLine>();
  for (const line of input.lines) lineByKey.set(keyOf(line.matchId, line.playerId), line);

  const aggByKey = new Map<string, RatingAggregate>();
  for (const agg of input.aggregates) {
    if (!(agg.votes > 0) || !isFiniteNumber(agg.adjustedAverage)) continue;
    const key = keyOf(agg.matchId, agg.playerId);
    const prev = aggByKey.get(key);
    // Duplicados: se queda el de más votos (y a igualdad, el mayor promedio) para no depender del orden.
    if (
      !prev ||
      agg.votes > prev.votes ||
      (agg.votes === prev.votes && (agg.adjustedAverage as number) > (prev.adjustedAverage as number))
    ) {
      aggByKey.set(key, agg);
    }
  }

  const seen = new Set<string>();
  const matches = [...input.matches].sort(compareMatches).filter((m) => {
    if (seen.has(m.matchId)) return false;
    seen.add(m.matchId);
    return true;
  });

  const byMatch: Record<string, MatchRating> = {};
  const perfByPlayer = new Map<string, Array<number | null>>();

  // --- Repetición cronológica -------------------------------------------------
  for (const match of matches) {
    const teamA = [...new Set(match.teams.a)].sort(compareIds);
    const inA = new Set(teamA);
    const teamB = [...new Set(match.teams.b)].filter((id) => !inA.has(id)).sort(compareIds);
    const participants = [...teamA, ...teamB].sort(compareIds);
    if (participants.length === 0) continue;

    for (const id of participants) ensure(id);
    const before = new Map(participants.map((id) => [id, combinedSkill(states.get(id)!, weights)]));

    // Rendimiento P (contracción hacia la media del partido).
    const rated = participants
      .map((id) => ({ id, agg: aggByKey.get(keyOf(match.matchId, id)) }))
      .filter((r): r is { id: string; agg: RatingAggregate } => r.agg !== undefined);
    const matchMean = mean(rated.map((r) => r.agg.adjustedAverage as number));
    const performances: Record<string, number> = {};
    for (const { id, agg } of rated) {
      performances[id] = shrinkPerformance(
        agg.adjustedAverage as number,
        agg.votes,
        matchMean as number,
        config.performance.shrinkageK,
      );
    }
    byMatch[match.matchId] = { performances };

    // Resultados (Elo por equipo con las habilidades previas al partido).
    const scoreA = match.score?.a;
    const scoreB = match.score?.b;
    const hasResult = isFiniteNumber(scoreA) && isFiniteNumber(scoreB) && teamA.length > 0 && teamB.length > 0;
    let deltaA = 0;
    if (hasResult) {
      const ratingA = sum(teamA.map((id) => before.get(id)!)) / teamA.length;
      const ratingB = sum(teamB.map((id) => before.get(id)!)) / teamB.length;
      const expectedA = eloExpected(ratingA, ratingB, config.results.eloScale);
      const actualA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
      const g = 1 + config.results.goalDiffFactor * Math.log(1 + Math.abs(scoreA - scoreB));
      deltaA = config.results.k * (actualA - expectedA) * g;
    }

    for (const id of participants) {
      const st = states.get(id)!;
      st.matches += 1;

      const p = performances[id];
      if (p !== undefined) {
        st.votedMatches += 1;
        st.sv = clampRating(st.sv + voteAlpha(st.votedMatches, config) * (p - st.sv));
      }

      if (hasResult) {
        st.resultMatches += 1;
        st.sr = clampRating(st.sr + (inA.has(id) ? deltaA : -deltaA));
      }

      const line = lineByKey.get(keyOf(match.matchId, id));
      const output = (line?.goals ?? 0) + config.offense.assistWeight * (line?.assists ?? 0);
      const baseline = config.offense.baselines[st.position ?? "unknown"];
      st.offenseSum += output - baseline;
      st.so = clampRating(st.prior + (config.offense.scale * st.offenseSum) / (st.matches + config.offense.shrinkageMatches));

      const perf = p ?? null;
      st.history.push({ matchId: match.matchId, playedAt: match.playedAt, skill: combinedSkill(st, weights), performance: perf });
      const list = perfByPlayer.get(id) ?? [];
      list.push(perf);
      perfByPlayer.set(id, list);
    }
  }

  // --- Resultado por jugador --------------------------------------------------
  const byPlayer: Record<string, PlayerRating> = {};
  for (const id of [...states.keys()].sort(compareIds)) {
    const st = states.get(id)!;
    const skill = combinedSkill(st, weights);
    const confidence = confidenceFor(st.matches, config);
    const sigma = sigmaFor(confidence, config);
    const perfs = perfByPlayer.get(id) ?? [];
    const voted = perfs.filter((p): p is number => p !== null);

    const recent = perfs.slice(-config.form.window).filter((p): p is number => p !== null);
    const recentForm = recent.length >= config.form.minWithVotes ? (mean(recent) as number) - skill : null;

    let consistency: number | null = null;
    if (voted.length >= config.consistency.minMatches && voted.length > 0) {
      const sd = populationStdDev(voted);
      const max = config.consistency.maxStdDev;
      consistency = max > 0 ? 100 * (1 - Math.min(sd, max) / max) : sd === 0 ? 100 : 0;
    }

    byPlayer[id] = {
      skill,
      confidence,
      sigma,
      matches: st.matches,
      matchesWithVotes: st.votedMatches,
      isProvisional: st.matches < config.confidence.provisionalMatches,
      performanceAvg: mean(voted),
      consistency,
      recentForm,
      conservative: skill - config.uncertainty.conservativeFactor * sigma,
      history: st.history,
    };
  }

  return { byPlayer, byMatch, engineVersion: ENGINE_VERSION };
}
