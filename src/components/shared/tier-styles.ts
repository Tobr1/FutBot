import { ratingTier, type RatingTier } from "@/domain/players/rating";

export interface TierStyle {
  /** Degradé vertical de la carta (usar junto con `bg-gradient-to-b`). */
  card: string;
  /** Color de brillo como fondo plano (compatibilidad). */
  glow: string;
  /** Brillo de esquina como degradé radial, sin `filter: blur` (más barato en móviles). */
  glowGradient: string;
  /** Color del número de valoración y del nombre del tier. */
  text: string;
}

/** Estilos de carta por tier de valoración (los umbrales viven en el dominio). */
export const TIER_STYLES: Record<RatingTier, TierStyle> = {
  promesa: {
    card: "from-[oklch(0.42_0.07_50)] via-[oklch(0.25_0.04_40)] to-[oklch(0.17_0.02_262)]",
    glow: "bg-[oklch(0.6_0.1_55/35%)]",
    glowGradient: "bg-[radial-gradient(circle_at_100%_0%,oklch(0.6_0.1_55/35%),transparent_55%)]",
    text: "text-[oklch(0.85_0.07_60)]",
  },
  titular: {
    card: "from-[oklch(0.5_0.02_250)] via-[oklch(0.28_0.025_255)] to-[oklch(0.17_0.02_262)]",
    glow: "bg-[oklch(0.8_0.02_250/30%)]",
    glowGradient: "bg-[radial-gradient(circle_at_100%_0%,oklch(0.8_0.02_250/30%),transparent_55%)]",
    text: "text-[oklch(0.92_0.01_250)]",
  },
  figura: {
    card: "from-[oklch(0.62_0.12_85)] via-[oklch(0.32_0.06_75)] to-[oklch(0.17_0.02_262)]",
    glow: "bg-[oklch(0.84_0.13_88/35%)]",
    glowGradient: "bg-[radial-gradient(circle_at_100%_0%,oklch(0.84_0.13_88/35%),transparent_55%)]",
    text: "text-gold",
  },
  crack: {
    card: "from-[oklch(0.55_0.2_265)] via-[oklch(0.3_0.12_280)] to-[oklch(0.15_0.03_262)]",
    glow: "bg-[oklch(0.62_0.2_258/45%)]",
    glowGradient: "bg-[radial-gradient(circle_at_100%_0%,oklch(0.62_0.2_258/45%),transparent_55%)]",
    text: "text-[oklch(0.85_0.12_245)]",
  },
};

export function tierStyle(rating: number): TierStyle {
  return TIER_STYLES[ratingTier(rating)];
}
