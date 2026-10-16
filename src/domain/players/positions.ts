import { Constants, type Enums } from "@/types/database";

export type Position = Enums<"player_position">;
export type DominantFoot = Enums<"dominant_foot">;

export const POSITIONS = Constants.public.Enums.player_position;
export const DOMINANT_FEET = Constants.public.Enums.dominant_foot;

export const POSITION_LABELS: Record<Position, { short: string; long: string }> = {
  goalkeeper: { short: "ARQ", long: "Arquero" },
  defender: { short: "DEF", long: "Defensor" },
  midfielder: { short: "MED", long: "Mediocampista" },
  forward: { short: "DEL", long: "Delantero" },
};

export const FOOT_LABELS: Record<DominantFoot, string> = {
  right: "Derecha",
  left: "Izquierda",
  both: "Ambas",
};

export interface PlayerPositions {
  primary: Position | null;
  secondary: Position | null;
}

/** Ordena las filas de player_positions en principal/secundaria. */
export function toPlayerPositions(rows: ReadonlyArray<{ position: Position; priority: number }>): PlayerPositions {
  return {
    primary: rows.find((r) => r.priority === 1)?.position ?? null,
    secondary: rows.find((r) => r.priority === 2)?.position ?? null,
  };
}
