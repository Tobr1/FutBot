/**
 * Votación paso a paso: un jugador por pantalla, el MVP y un resumen.
 * "No lo vi jugar" no es un voto: ese jugador queda sin calificar (no cuenta
 * en su promedio). Puro.
 */

import { isValidScore, type RatingDraft } from "./voting";

export type StepStatus = "rated" | "skipped" | "pending";

export function stepStatus(id: string, draft: RatingDraft, skipped: ReadonlySet<string>): StepStatus {
  if (isValidScore(draft[id])) return "rated";
  return skipped.has(id) ? "skipped" : "pending";
}

export interface VotingSummary {
  rated: number;
  skipped: number;
  pending: number;
}

export function votingSummary(ids: readonly string[], draft: RatingDraft, skipped: ReadonlySet<string>): VotingSummary {
  const summary: VotingSummary = { rated: 0, skipped: 0, pending: 0 };
  for (const id of ids) summary[stepStatus(id, draft, skipped)] += 1;
  return summary;
}

/** Primer jugador sin responder (ni calificado ni "no lo vi"), o -1 si no queda ninguno. */
export function firstPendingIndex(ids: readonly string[], draft: RatingDraft, skipped: ReadonlySet<string>): number {
  return ids.findIndex((id) => stepStatus(id, draft, skipped) === "pending");
}

/** "Calificaste a 6 · 2 no los viste · faltan 1". Solo las partes que no son cero. */
export function summaryLabel({ rated, skipped, pending }: VotingSummary): string {
  const parts: string[] = [];
  if (rated > 0) parts.push(`Calificaste a ${rated}`);
  if (skipped > 0) parts.push(skipped === 1 ? "1 no lo viste" : `${skipped} no los viste`);
  if (pending > 0) parts.push(pending === 1 ? "falta 1" : `faltan ${pending}`);
  return parts.length > 0 ? parts.join(" · ") : "Todavía no calificaste a nadie";
}
