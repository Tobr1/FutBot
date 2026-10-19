/**
 * Probabilidad de victoria de un armado de equipos, con el mismo esperado
 * Elo que usa el motor (docs/ANALISIS.md §6.3).
 */

import { resolveRatingConfig, type RatingConfigOverrides } from "./config";
import { eloExpected } from "./engine";

export interface WinProbability {
  a: number;
  draw: number;
  b: number;
}

function average(values: readonly number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  let total = 0;
  for (const v of finite) total += v;
  return total / finite.length;
}

/**
 * Probabilidades de que gane A, de empate y de que gane B (suman 1).
 * Empate ≈ drawFactor · (1 − |p_A − p_B|); el resto se reparte según el
 * esperado Elo. Sin habilidades en algún equipo se asume paridad.
 */
export function winProbability(
  teamASkills: readonly number[],
  teamBSkills: readonly number[],
  overrides?: RatingConfigOverrides,
): WinProbability {
  const config = resolveRatingConfig(overrides);
  const ra = average(teamASkills);
  const rb = average(teamBSkills);
  const expectedA = ra === null || rb === null ? 0.5 : eloExpected(ra, rb, config.results.eloScale);
  const expectedB = 1 - expectedA;
  const factor = Math.min(1, Math.max(0, config.prediction.drawFactor));
  const draw = factor * (1 - Math.abs(expectedA - expectedB));
  const a = expectedA * (1 - draw);
  return { a, draw, b: 1 - draw - a };
}
