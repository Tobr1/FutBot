/**
 * Presentación de la valoración (escala interna 1-10, D-003).
 * El motor de valoración completo llega en la Fase 3; acá solo hay
 * utilidades de lectura compartidas por la UI.
 */

export type RatingTier = "promesa" | "titular" | "figura" | "crack";

export const TIER_LABELS: Record<RatingTier, string> = {
  promesa: "Promesa",
  titular: "Titular",
  figura: "Figura",
  crack: "Crack",
};

export function ratingTier(rating: number): RatingTier {
  if (rating >= 8) return "crack";
  if (rating >= 6.5) return "figura";
  if (rating >= 5) return "titular";
  return "promesa";
}

/** Valoración de tarjeta 10-99 a partir de la escala 1-10. */
export function overall(rating: number): number {
  return Math.max(10, Math.min(99, Math.round(rating * 10)));
}

/** Texto de ayuda para el nivel inicial que fija un admin. */
export function baseRatingHint(rating: number): string {
  if (rating >= 8.5) return "Diferencial: define partidos.";
  if (rating >= 7) return "Muy bueno: de los mejores del grupo.";
  if (rating >= 5.5) return "Sólido: aporta siempre.";
  if (rating >= 4) return "En desarrollo: le cuesta un poco más.";
  return "Recién arranca.";
}
