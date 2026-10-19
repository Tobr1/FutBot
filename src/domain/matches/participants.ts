/**
 * Convocatoria: lista ordenada de jugadores titulares y suplentes.
 * El orden se conserva (es el de la lista de WhatsApp o el de selección).
 */
import type { ParticipantStatus } from "./status";

export interface Selection {
  playerId: string;
  status: ParticipantStatus;
}

export function countSelection(list: readonly Selection[]): { confirmed: number; reserve: number } {
  let confirmed = 0;
  for (const item of list) if (item.status === "confirmed") confirmed += 1;
  return { confirmed, reserve: list.length - confirmed };
}

/**
 * Tocar un jugador: si estaba, sale; si no, entra al final como titular
 * (o como suplente si los titulares ya completan los dos equipos).
 */
export function toggleSelection(list: readonly Selection[], playerId: string, capacity: number): Selection[] {
  if (list.some((item) => item.playerId === playerId)) return list.filter((item) => item.playerId !== playerId);
  const { confirmed } = countSelection(list);
  return [...list, { playerId, status: confirmed >= capacity ? "reserve" : "confirmed" }];
}

export function setSelectionStatus(list: readonly Selection[], playerId: string, status: ParticipantStatus): Selection[] {
  return list.map((item) => (item.playerId === playerId ? { ...item, status } : item));
}

/** Orden para guardar: titulares primero y después suplentes, cada grupo en su orden. */
export function orderForSave(list: readonly Selection[]): Selection[] {
  return [...list.filter((item) => item.status === "confirmed"), ...list.filter((item) => item.status === "reserve")];
}

/** Quita repetidos conservando la primera aparición. */
export function dedupeSelection(list: readonly Selection[]): Selection[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.playerId)) return false;
    seen.add(item.playerId);
    return true;
  });
}
