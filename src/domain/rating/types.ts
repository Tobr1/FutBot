/**
 * Tipos de entrada y salida del motor de valoración (docs/ANALISIS.md §6).
 * Las entradas reflejan las filas de SQL: `player_match_lines` y
 * `get_rating_aggregates` (migración 20261016000300).
 */

export type Side = "a" | "b";

export type RatingPosition = "goalkeeper" | "defender" | "midfielder" | "forward";

/** Un partido finalizado con marcador. */
export interface MatchHistory {
  matchId: string;
  /** Fecha ISO 8601 (scheduled_at). */
  playedAt: string;
  teams: { a: string[]; b: string[] };
  score: { a: number; b: number };
}

/** Una fila de `player_match_lines`. */
export interface PlayerLine {
  matchId: string;
  playerId: string;
  side: Side;
  goals: number;
  assists: number;
  ownGoals: number;
  isMvp: boolean;
}

/** Una fila de `get_rating_aggregates` (solo votaciones cerradas). */
export interface RatingAggregate {
  matchId: string;
  playerId: string;
  votes: number;
  /** Media corregida por sesgo del votante y recortada; `null` si no hay votos válidos. */
  adjustedAverage: number | null;
}

export interface PlayerProfile {
  id: string;
  /**
   * Nivel inicial 1-10 fijado por un admin. Si falta (o no es un número
   * finito) se usa la media de los niveles iniciales del grupo.
   */
  baseRating: number | null;
  primaryPosition: RatingPosition | null;
}

export interface RatingInput {
  players: readonly PlayerProfile[];
  matches: readonly MatchHistory[];
  lines: readonly PlayerLine[];
  aggregates: readonly RatingAggregate[];
}

export interface PlayerHistoryPoint {
  matchId: string;
  playedAt: string;
  /** Habilidad estimada S después del partido. */
  skill: number;
  /** Rendimiento P de ese partido; `null` si no hubo votos válidos. */
  performance: number | null;
}

export interface PlayerRating {
  /** Habilidad estimada S (1-10). */
  skill: number;
  /** c = 1 − e^(−n/τ), entre 0 y 1. */
  confidence: number;
  /** Incertidumbre σ: baja de σ₀ a σ_min a medida que sube la confianza. */
  sigma: number;
  matches: number;
  matchesWithVotes: number;
  isProvisional: boolean;
  /** Media de P; `null` sin partidos con votos. */
  performanceAvg: number | null;
  /** Regularidad 0-100 (menor desvío de P = más alto); `null` con pocos partidos con votos. */
  consistency: number | null;
  /** Media de P de los últimos partidos menos S; `null` sin votos suficientes. */
  recentForm: number | null;
  /** Valoración conservadora S − σ (para el ranking general). */
  conservative: number;
  history: PlayerHistoryPoint[];
}

export interface MatchRating {
  /** P por jugador (solo los que tuvieron votos válidos). */
  performances: Record<string, number>;
}

export interface RatingResult {
  byPlayer: Record<string, PlayerRating>;
  byMatch: Record<string, MatchRating>;
  engineVersion: string;
}
