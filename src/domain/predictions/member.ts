/**
 * Pronósticos de los miembros: puntos por partido y ranking. Puro.
 * 3 puntos por el resultado exacto, 1 por acertar quién gana (o el empate).
 */

export const POINTS_EXACT = 3;
export const POINTS_OUTCOME = 1;

export interface Score {
  a: number;
  b: number;
}

const outcomeOf = ({ a, b }: Score) => Math.sign(a - b);

export type PredictionHit = "exact" | "outcome" | "miss";

export function predictionHit(prediction: Score, result: Score): PredictionHit {
  if (prediction.a === result.a && prediction.b === result.b) return "exact";
  return outcomeOf(prediction) === outcomeOf(result) ? "outcome" : "miss";
}

export function predictionPoints(prediction: Score, result: Score): number {
  const hit = predictionHit(prediction, result);
  return hit === "exact" ? POINTS_EXACT : hit === "outcome" ? POINTS_OUTCOME : 0;
}

export interface PredictionRow {
  profileId: string;
  matchId: string;
  prediction: Score;
  /** Resultado del partido, si ya se jugó. */
  result: Score | null;
}

export interface PredictorStanding {
  profileId: string;
  points: number;
  exact: number;
  /** Pronósticos de partidos ya jugados. */
  played: number;
}

/**
 * Tabla de pronosticadores con partidos jugados: más puntos, después más
 * exactos, después menos pronósticos (mejor eficacia). Ignora los pendientes.
 */
export function predictionStandings(rows: readonly PredictionRow[]): PredictorStanding[] {
  const byProfile = new Map<string, PredictorStanding>();
  for (const row of rows) {
    if (!row.result) continue;
    const s = byProfile.get(row.profileId) ?? { profileId: row.profileId, points: 0, exact: 0, played: 0 };
    s.points += predictionPoints(row.prediction, row.result);
    if (predictionHit(row.prediction, row.result) === "exact") s.exact += 1;
    s.played += 1;
    byProfile.set(row.profileId, s);
  }
  return [...byProfile.values()].sort((x, y) => y.points - x.points || y.exact - x.exact || x.played - y.played);
}
