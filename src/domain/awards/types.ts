/**
 * Premios y logros: tipos compartidos. Cada logro es un hecho derivado del
 * historial (no se guarda): se recalcula al leer, como la valoración.
 */

export type AwardTier = "bronze" | "silver" | "gold";

export type AwardKind =
  | "hat-trick"
  | "brace"
  | "assists"
  | "mvp"
  | "win-streak"
  | "unbeaten"
  | "clean-sheet"
  | "debut"
  | "matches"
  | "attendance"
  | "month-scorer"
  | "month-mvp"
  | "season-best";

/** Nombre del ícono de lucide-react (la UI lo traduce a componente). */
export type AwardIcon =
  | "Flame"
  | "Goal"
  | "Handshake"
  | "Star"
  | "Zap"
  | "ShieldCheck"
  | "BrickWall"
  | "Footprints"
  | "Medal"
  | "CalendarCheck"
  | "Crown"
  | "Trophy";

export interface Award {
  /** Único y estable: `${kind}:${playerId}:${contexto}`. */
  id: string;
  kind: AwardKind;
  playerId: string;
  title: string;
  description: string;
  icon: AwardIcon;
  tier: AwardTier;
  /** ISO del partido en que se ganó (o del último partido del mes/temporada). */
  earnedAt: string;
  /** Partido donde se ganó; null para los premios del mes o de la temporada. */
  matchId: string | null;
}

export const TIER_RANK: Record<AwardTier, number> = { gold: 3, silver: 2, bronze: 1 };

export const TIER_LABELS: Record<AwardTier, string> = { gold: "Oro", silver: "Plata", bronze: "Bronce" };
