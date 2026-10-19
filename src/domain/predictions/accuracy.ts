/**
 * "Pronóstico del sistema": qué habría dicho `winProbability` antes de cada
 * partido jugado (con la habilidad S de cada jugador previa al partido, del
 * historial del motor) contra lo que pasó. Mide aciertos y calibración. Puro.
 */

import { clampRating } from "@/domain/players/rating";
import {
  type PlayerProfile,
  type RatingConfigOverrides,
  type RatingResult,
  resolveRatingConfig,
  type Side,
  winProbability,
  type WinProbability,
} from "@/domain/rating";
import type { MatchLineRow } from "@/domain/stats/engine-input";
import { type MatchSummary, summarizeMatches } from "@/domain/stats/match-summaries";

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/**
 * Habilidad de cada jugador antes de cada partido: el punto anterior de su
 * historia en el motor o, en su primer partido, el nivel inicial (o la media
 * del grupo, como hace el motor).
 */
export function preMatchSkills(
  result: Pick<RatingResult, "byPlayer">,
  players: readonly PlayerProfile[],
  overrides?: RatingConfigOverrides,
): (matchId: string, playerId: string) => number {
  const config = resolveRatingConfig(overrides);
  const bases = players.map((p) => p.baseRating).filter(isFiniteNumber);
  const groupMean = clampRating(bases.length > 0 ? bases.reduce((s, v) => s + v, 0) / bases.length : config.defaultRating);
  const priors = new Map(players.map((p) => [p.id, isFiniteNumber(p.baseRating) ? clampRating(p.baseRating) : groupMean]));

  const before = new Map<string, number>();
  for (const [playerId, rating] of Object.entries(result.byPlayer)) {
    let previous = priors.get(playerId) ?? groupMean;
    for (const point of rating.history) {
      before.set(`${point.matchId}|${playerId}`, previous);
      previous = point.skill;
    }
  }
  return (matchId, playerId) => before.get(`${matchId}|${playerId}`) ?? priors.get(playerId) ?? groupMean;
}

export type Outcome = Side | "draw";

export interface MatchPrediction {
  matchId: string;
  scheduledAt: string;
  probability: WinProbability;
  /** Equipo favorito; null si el pronóstico era 50/50. */
  favorite: Side | null;
  /** Probabilidad de que gane el favorito. */
  favoriteChance: number;
  outcome: Outcome;
  /** El favorito ganó. null sin favorito. */
  hit: boolean | null;
}

/** Diferencia mínima entre A y B para que haya favorito. */
const EVEN_EPSILON = 0.005;

export function predictMatch(match: MatchSummary, skillBefore: (matchId: string, playerId: string) => number): MatchPrediction {
  const probability = winProbability(
    match.teams.a.map((id) => skillBefore(match.matchId, id)),
    match.teams.b.map((id) => skillBefore(match.matchId, id)),
  );
  const outcome: Outcome = match.score.a > match.score.b ? "a" : match.score.a < match.score.b ? "b" : "draw";
  const favorite: Side | null = Math.abs(probability.a - probability.b) < EVEN_EPSILON ? null : probability.a > probability.b ? "a" : "b";
  return {
    matchId: match.matchId,
    scheduledAt: match.scheduledAt,
    probability,
    favorite,
    favoriteChance: favorite ? probability[favorite] : Math.max(probability.a, probability.b),
    outcome,
    hit: favorite ? outcome === favorite : null,
  };
}

export interface CalibrationBucket {
  key: "parejo" | "leve" | "claro";
  label: string;
  /** Partidos con favorito en este rango. */
  matches: number;
  /** Probabilidad media que el sistema le daba al favorito. */
  expected: number;
  /** Proporción real de victorias del favorito; null sin partidos. */
  observed: number | null;
}

export interface PredictionAccuracy {
  predictions: MatchPrediction[];
  /** Partidos con favorito. */
  decided: number;
  hits: number;
  draws: number;
  /** Aciertos sobre partidos con favorito; null si no hay ninguno. */
  hitRate: number | null;
  /** Brier multiclase (A/empate/B): 0 es perfecto, ~0,67 es tirar una moneda de tres caras. */
  brier: number | null;
  calibration: CalibrationBucket[];
}

const BUCKETS: ReadonlyArray<{ key: CalibrationBucket["key"]; label: string; min: number; max: number }> = [
  { key: "parejo", label: "Parejo", min: 0, max: 0.45 },
  { key: "leve", label: "Favorito leve", min: 0.45, max: 0.55 },
  { key: "claro", label: "Favorito claro", min: 0.55, max: 1.01 },
];

export function predictionAccuracy(
  lines: readonly MatchLineRow[],
  skillBefore: (matchId: string, playerId: string) => number,
): PredictionAccuracy {
  const predictions = summarizeMatches(lines)
    .filter((m) => m.teams.a.length > 0 && m.teams.b.length > 0)
    .map((m) => predictMatch(m, skillBefore));

  let decided = 0;
  let hits = 0;
  let draws = 0;
  let brierSum = 0;
  const acc = BUCKETS.map(() => ({ matches: 0, expected: 0, wins: 0 }));
  for (const p of predictions) {
    if (p.outcome === "draw") draws += 1;
    const actual = { a: p.outcome === "a" ? 1 : 0, draw: p.outcome === "draw" ? 1 : 0, b: p.outcome === "b" ? 1 : 0 };
    brierSum += (p.probability.a - actual.a) ** 2 + (p.probability.draw - actual.draw) ** 2 + (p.probability.b - actual.b) ** 2;
    if (!p.favorite) continue;
    decided += 1;
    if (p.hit) hits += 1;
    const index = BUCKETS.findIndex((b) => p.favoriteChance >= b.min && p.favoriteChance < b.max);
    if (index >= 0) {
      acc[index].matches += 1;
      acc[index].expected += p.favoriteChance;
      if (p.hit) acc[index].wins += 1;
    }
  }

  return {
    predictions,
    decided,
    hits,
    draws,
    hitRate: decided > 0 ? hits / decided : null,
    brier: predictions.length > 0 ? brierSum / predictions.length : null,
    calibration: BUCKETS.map((b, i) => ({
      key: b.key,
      label: b.label,
      matches: acc[i].matches,
      expected: acc[i].matches > 0 ? acc[i].expected / acc[i].matches : (b.min + Math.min(b.max, 1)) / 2,
      observed: acc[i].matches > 0 ? acc[i].wins / acc[i].matches : null,
    })),
  };
}

/** "64%" (porcentaje entero, como en el resto de la app). */
export function percentText(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
