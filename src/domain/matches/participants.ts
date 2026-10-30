/**
 * Convocatoria: lista ordenada de jugadores titulares y suplentes.
 * El orden se conserva (es el de la lista de WhatsApp o el de selección).
 */
import { normalizeName } from "@/domain/names/normalize";
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

/* ---------- Invitados ---------- */

/** Invitado a sumar: viene a completar, juega solo este partido y no entra al plantel. */
export interface GuestEntry {
  nickname: string;
  status: ParticipantStatus;
}

export const GUEST_NAME_MAX = 30;

export type GuestNameResult =
  | { kind: "invalid"; message: string }
  /** Ya tiene ficha (del plantel o de invitado en otro partido): se convoca esa. */
  | { kind: "player"; playerId: string; nickname: string; isGuest: boolean }
  | { kind: "guest"; nickname: string };

/** Qué hacer con el nombre escrito en "Sumar invitado". Compara como la base (normalize_name). */
export function resolveGuestName(
  name: string,
  roster: ReadonlyArray<{ id: string; nickname: string; isGuest?: boolean }>,
  guests: readonly GuestEntry[],
): GuestNameResult {
  const nickname = name.trim().replace(/\s+/g, " ");
  const key = normalizeName(nickname);
  if (!key) return { kind: "invalid", message: "Escribí el nombre del invitado." };
  if (nickname.length > GUEST_NAME_MAX) return { kind: "invalid", message: `Usá como máximo ${GUEST_NAME_MAX} caracteres.` };
  if (guests.some((g) => normalizeName(g.nickname) === key)) return { kind: "invalid", message: `${nickname} ya está en la lista.` };
  const existing = roster.find((p) => normalizeName(p.nickname) === key);
  if (existing) return { kind: "player", playerId: existing.id, nickname: existing.nickname, isGuest: existing.isGuest === true };
  return { kind: "guest", nickname };
}

/** Titulares que suman los invitados (para descontarlos del cupo). */
export const confirmedGuests = (guests: readonly GuestEntry[]) => guests.filter((g) => g.status === "confirmed").length;
