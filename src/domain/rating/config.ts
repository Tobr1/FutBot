/**
 * Parámetros del motor de valoración (docs/ANALISIS.md §6). Versionados con
 * ENGINE_VERSION: si cambia la fórmula se sube la versión y se recalcula.
 */

import type { RatingPosition } from "./types";

export const ENGINE_VERSION = "v1";

export interface RatingConfig {
  /** Nivel de arranque si ningún jugador del grupo tiene nivel inicial. */
  defaultRating: number;
  performance: {
    /** k de la contracción bayesiana P = (k·μ + n·x̄) / (k + n). */
    shrinkageK: number;
  };
  votes: {
    /** α_n = max(α_min, 1 / (n + n₀)). */
    n0: number;
    alphaMin: number;
  };
  /** Pesos de S = Σ wᵢ·Sᵢ (se renormalizan si falta un componente). */
  weights: {
    votes: number;
    results: number;
    offense: number;
  };
  results: {
    /** D del esperado Elo E = 1 / (1 + 10^((R_rival − R_propio) / D)), en escala 1-10. */
    eloScale: number;
    /** K de la actualización K·(resultado − E)·g(dif. de gol). */
    k: number;
    /** g(d) = 1 + goalDiffFactor·ln(1 + |d|). */
    goalDiffFactor: number;
  };
  offense: {
    /** Aporte = goles + assistWeight·asistencias. */
    assistWeight: number;
    /** Aporte esperable por partido según la posición principal. */
    baselines: Record<RatingPosition | "unknown", number>;
    /** Partidos "ficticios" en cero que contraen la media hacia lo esperable. */
    shrinkageMatches: number;
    /** Puntos de valoración por unidad de aporte sobre lo esperable por partido. */
    scale: number;
  };
  confidence: {
    /** τ de c = 1 − e^(−n/τ). */
    tau: number;
    /** Con menos partidos que esto la valoración es "provisional". */
    provisionalMatches: number;
  };
  uncertainty: {
    /** σ sin partidos jugados. */
    sigma0: number;
    /** σ con confianza plena. */
    sigmaMin: number;
    /** Valoración conservadora = S − factor·σ. */
    conservativeFactor: number;
  };
  form: {
    /** Últimos N partidos jugados. */
    window: number;
    /** Mínimo de esos partidos con votos para calcular la forma. */
    minWithVotes: number;
  };
  consistency: {
    /** Mínimo de partidos con votos para calcular la regularidad. */
    minMatches: number;
    /** Desvío de P que equivale a regularidad 0. */
    maxStdDev: number;
  };
  prediction: {
    /** Empate ≈ drawFactor · (1 − |p_A − p_B|). */
    drawFactor: number;
  };
}

export const DEFAULT_RATING_CONFIG: RatingConfig = {
  defaultRating: 5,
  performance: { shrinkageK: 2 },
  votes: { n0: 3, alphaMin: 0.12 },
  weights: { votes: 0.65, results: 0.25, offense: 0.1 },
  results: { eloScale: 2, k: 0.3, goalDiffFactor: 0.5 },
  offense: {
    assistWeight: 0.7,
    baselines: { goalkeeper: 0.1, defender: 0.4, midfielder: 0.8, forward: 1.2, unknown: 0.7 },
    shrinkageMatches: 5,
    scale: 1.5,
  },
  confidence: { tau: 4, provisionalMatches: 3 },
  uncertainty: { sigma0: 1.5, sigmaMin: 0.4, conservativeFactor: 1 },
  form: { window: 5, minWithVotes: 3 },
  consistency: { minMatches: 5, maxStdDev: 2.5 },
  prediction: { drawFactor: 0.25 },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Cambios parciales sobre DEFAULT_RATING_CONFIG (cualquier nivel de anidamiento). */
export type RatingConfigOverrides = DeepPartial<RatingConfig>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : patch) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    out[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], value) : value;
  }
  return out as T;
}

/** Configuración por defecto con los cambios parciales aplicados (merge profundo). */
export function resolveRatingConfig(overrides?: RatingConfigOverrides): RatingConfig {
  return overrides ? deepMerge(DEFAULT_RATING_CONFIG, overrides) : DEFAULT_RATING_CONFIG;
}
