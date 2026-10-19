/**
 * Tipos del armado de equipos (ANALISIS §7). Módulo puro, sin IO.
 */
import type { Position } from "@/domain/players/positions";

export type { Position };

/** Orden fijo de posiciones para métricas y textos. */
export const BALANCER_POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"] as const satisfies readonly Position[];

export type Side = "a" | "b";

export interface BalancerPlayer {
  id: string;
  name: string;
  /** Habilidad estimada S en escala 1-10. */
  skill: number;
  /** Incertidumbre σ de la habilidad. Si falta se toma 0 (sin incertidumbre informada). */
  sigma?: number;
  /** Forma reciente como diferencia respecto de S (positiva = viene jugando mejor). Default 0. */
  form?: number;
  primary: Position | null;
  secondary?: Position | null;
}

export interface Constraints {
  /** Jugadores fijados a un equipo. */
  pinned?: Record<string, Side>;
  /** Pares que juegan en el mismo equipo. */
  together?: Array<[string, string]>;
  /** Pares que juegan en equipos distintos. */
  apart?: Array<[string, string]>;
}

export interface BalancerWeights {
  level: number;
  positions: number;
  form: number;
  uncertainty: number;
  repetition: number;
}

export interface BalancerOptions {
  weights?: Partial<BalancerWeights>;
  /** Equipos del partido anterior: activa el término de repetición (variedad). */
  previousTeams?: { a: string[]; b: string[] };
  /** Cantidad de alternativas distintas a devolver. Default 5. */
  topK?: number;
  /** Hasta cuántos jugadores se usa la búsqueda exhaustiva. Default 22. */
  exhaustiveLimit?: number;
  /** Semilla del generador pseudoaleatorio de la heurística (reproducible). */
  seed?: number;
  /** Las alternativas difieren en al menos esta cantidad de jugadores. Default 2. */
  minDiff?: number;
}

export interface SplitMetrics {
  sumA: number;
  sumB: number;
  avgA: number;
  avgB: number;
  /** |ΣS_A − ΣS_B| dividido por el tamaño por equipo (n / 2): puntos de diferencia por jugador. */
  levelDiff: number;
  /** Diferencia de sumas respecto de la fuerza media de un equipo, en %. */
  levelDiffPct: number;
  /** Arqueros naturales (posición principal) en cada equipo. */
  gkA: number;
  gkB: number;
  /** Conteos ponderados por posición: principal = 1, secundaria = 0,5. */
  positionCounts: { a: Record<Position, number>; b: Record<Position, number> };
  /** |Σforma_A − Σforma_B| / (n / 2). */
  formDiff: number;
  /** |Σσ²_A − Σσ²_B|. */
  uncertaintyDiff: number;
  /**
   * Fracción de los jugadores que también jugaron el partido anterior y quedan en el mismo
   * equipo que entonces (sin importar el color, 0,5-1). `null` sin equipos previos.
   */
  repetitionOverlap: number | null;
  /** Jugadores que cambiaron de equipo respecto del partido anterior. `null` sin equipos previos. */
  repetitionChanges: number | null;
}

export interface TeamSplit {
  a: string[];
  b: string[];
  cost: number;
  metrics: SplitMetrics;
}

export interface BalanceResult {
  alternatives: TeamSplit[];
  method: "exhaustive" | "heuristic";
  /** Particiones evaluadas con la función de costo. */
  evaluated: number;
  /** Problemas de entrada o restricciones imposibles (en ese caso no hay alternativas). */
  violations: string[];
}
