/**
 * Punto de entrada del armado de equipos (ANALISIS §7). Nunca reparte al azar: con hasta
 * `exhaustiveLimit` jugadores devuelve el óptimo garantizado de la función de costo; con más,
 * una heurística determinista (misma semilla → mismos equipos).
 */
import { computeMetrics, prepareContext } from "./cost";
import { analyzeConstraints } from "./constraints";
import { MAX_EXHAUSTIVE_PLAYERS, searchExhaustive, type SearchOutput } from "./exhaustive";
import { DEFAULT_SEED, searchHeuristic } from "./heuristic";
import type { BalanceResult, BalancerOptions, BalancerPlayer, Constraints, TeamSplit } from "./types";

export const DEFAULT_TOP_K = 5;
export const DEFAULT_EXHAUSTIVE_LIMIT = 22;
export const DEFAULT_MIN_DIFF = 2;

/**
 * Arma hasta `topK` alternativas distintas ordenadas de más a menos pareja.
 * No lanza: los problemas de entrada (menos de 6 jugadores, ids desconocidos, restricciones
 * contradictorias o imposibles) vuelven en `violations` con `alternatives` vacío.
 */
export function balanceTeams(
  players: readonly BalancerPlayer[],
  constraints: Constraints = {},
  options: BalancerOptions = {},
): BalanceResult {
  const n = players.length;
  const topK = Math.max(1, Math.floor(options.topK ?? DEFAULT_TOP_K));
  const minDiff = Math.max(1, Math.floor(options.minDiff ?? DEFAULT_MIN_DIFF));
  const limit = Math.min(options.exhaustiveLimit ?? DEFAULT_EXHAUSTIVE_LIMIT, MAX_EXHAUSTIVE_PLAYERS);
  const method = n <= limit ? "exhaustive" : "heuristic";

  const { violations, indexed, feasible } = analyzeConstraints(players, constraints);
  if (!indexed || !feasible) return { alternatives: [], method, evaluated: 0, violations };

  const ctx = prepareContext(players, options);
  const output: SearchOutput =
    method === "exhaustive"
      ? searchExhaustive(ctx, indexed, topK, minDiff)
      : searchHeuristic(ctx, indexed, feasible, { topK, minDiff, seed: options.seed ?? DEFAULT_SEED });

  const alternatives: TeamSplit[] = output.solutions.map(({ side, cost }) => ({
    a: players.filter((_, i) => side[i] === 0).map((p) => p.id),
    b: players.filter((_, i) => side[i] === 1).map((p) => p.id),
    cost,
    metrics: computeMetrics(side, ctx),
  }));

  return {
    alternatives,
    method,
    evaluated: output.evaluated,
    violations: alternatives.length ? [] : ["No se encontró ningún armado que respete las restricciones."],
  };
}
