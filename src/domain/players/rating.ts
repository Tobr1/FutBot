/**
 * Presentación de la valoración (escala interna 1-10, D-003).
 * El motor de valoración completo llega más adelante; acá solo hay
 * utilidades de lectura y edición compartidas por la UI.
 */

export type RatingTier = "promesa" | "titular" | "figura" | "crack";

export const TIER_LABELS: Record<RatingTier, string> = {
  promesa: "Promesa",
  titular: "Titular",
  figura: "Figura",
  crack: "Crack",
};

/** Valoración mínima (escala 1-10) a partir de la cual se entra en cada tier. */
export const TIER_THRESHOLDS = { titular: 5, figura: 6.5, crack: 8 } as const;

export const RATING_MIN = 1;
export const RATING_MAX = 10;
export const RATING_STEP = 0.5;

export function ratingTier(rating: number): RatingTier {
  if (rating >= TIER_THRESHOLDS.crack) return "crack";
  if (rating >= TIER_THRESHOLDS.figura) return "figura";
  if (rating >= TIER_THRESHOLDS.titular) return "titular";
  return "promesa";
}

/** Valoración de tarjeta 10-99 a partir de la escala 1-10. */
export function overall(rating: number): number {
  return Math.max(10, Math.min(99, Math.round(rating * 10)));
}

/** Acota una valoración al rango 1-10. Un valor no numérico vuelve al mínimo. */
export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return RATING_MIN;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, n));
}

/** Pequeña tolerancia para errores de coma flotante al ajustar a la grilla. */
const EPSILON = 1e-9;

/**
 * Sube o baja la valoración al siguiente múltiplo de 0,5 (botones − / +).
 * Un valor fuera de la grilla salta al múltiplo más cercano en esa dirección
 * (7,3 → 7,5 al subir, 7 al bajar) y el resultado siempre queda en 1-10.
 */
export function stepRating(rating: number, dir: 1 | -1): number {
  const units = clampRating(rating) / RATING_STEP;
  const next = dir === 1 ? Math.floor(units + EPSILON) + 1 : Math.ceil(units - EPSILON) - 1;
  return clampRating(next * RATING_STEP);
}

/** Texto de ayuda para el nivel inicial que fija un admin. */
export function baseRatingHint(rating: number): string {
  if (rating >= 8.5) return "Diferencial: define partidos.";
  if (rating >= 7) return "Muy bueno: de los mejores del grupo.";
  if (rating >= 5.5) return "Sólido: aporta siempre.";
  if (rating >= 4) return "En desarrollo: le cuesta un poco más.";
  return "Recién arranca.";
}
