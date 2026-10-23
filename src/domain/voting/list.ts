/**
 * Lista de votaciones del grupo: en qué estado está cada una para mí.
 * Nunca incluye notas (solo cantidades). Puro.
 */

import type { VotingPhase } from "./voting";

export type MyVotingState =
  /** Abierta y jugué: me falta calificar a alguien o elegir MVP. */
  | "pending"
  /** Abierta y ya califiqué a todos (o marqué que no los vi) y elegí MVP. */
  | "done"
  /** Abierta pero no jugué (o no tengo ficha): solo miro. */
  | "watching"
  | "closed";

export interface MyVotingInput {
  phase: Exclude<VotingPhase, "pending">;
  /** Jugué el partido (estoy en un equipo). */
  played: boolean;
  /** Compañeros y rivales a calificar (sin mí). */
  total: number;
  /** A cuántos ya califiqué. */
  rated: number;
  mvpVoted: boolean;
}

export function myVotingState({ phase, played, total, rated, mvpVoted }: MyVotingInput): MyVotingState {
  if (phase === "closed") return "closed";
  if (!played) return "watching";
  // Sin a quién calificar (partido de 1 vs 1 sin compañeros) solo queda el MVP.
  return rated >= total && (mvpVoted || total === 0) ? "done" : "pending";
}

export interface VotingSections<T> {
  pending: T[];
  done: T[];
  watching: T[];
  closed: T[];
}

/** Agrupa por estado conservando el orden de entrada. */
export function groupVotings<T extends { state: MyVotingState }>(items: readonly T[]): VotingSections<T> {
  const sections: VotingSections<T> = { pending: [], done: [], watching: [], closed: [] };
  for (const item of items) sections[item.state].push(item);
  return sections;
}
