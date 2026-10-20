/**
 * "Voy / No voy": estado de asistencia de un jugador y el mensaje de
 * convocatoria para el grupo de WhatsApp. Puro.
 */

import type { MatchStatus } from "./status";

export type AttendanceStatus = "confirmed" | "reserve" | "dropped";

export type MyAttendance =
  | { kind: "confirmed" }
  | { kind: "reserve"; position: number }
  | { kind: "dropped" }
  | { kind: "none" };

interface ParticipantLike {
  id: string;
  status: AttendanceStatus;
  sortOrder: number;
}

/** Se puede confirmar o bajarse hasta la hora del partido, si sigue programado. */
export function canChangeAttendance(status: MatchStatus, scheduledAt: string, nowMs: number): boolean {
  return status === "scheduled" && Date.parse(scheduledAt) > nowMs;
}

/** Suplentes en orden de llegada (como los sube la base). */
export function reservesInOrder<T extends ParticipantLike>(participants: T[]): T[] {
  return participants.filter((p) => p.status === "reserve").sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Dónde está el jugador en la convocatoria (suplente con su número en la fila). */
export function myAttendance(participants: ParticipantLike[], playerId: string | null): MyAttendance {
  if (!playerId) return { kind: "none" };
  const me = participants.find((p) => p.id === playerId);
  if (!me) return { kind: "none" };
  if (me.status === "reserve") {
    return { kind: "reserve", position: reservesInOrder(participants).findIndex((p) => p.id === playerId) + 1 };
  }
  return { kind: me.status };
}

export interface MatchCallInput {
  groupName: string;
  /** "Sáb 25/10 · 22:00". */
  whenLabel: string;
  venue?: string | null;
  /** Titulares en orden. */
  confirmed: string[];
  /** Suplentes en orden. */
  reserves: string[];
  /** Cupo de titulares (jugadores por equipo × 2). */
  capacity: number;
  /** Link al partido para confirmar. */
  url: string;
}

/**
 * Mensaje para pegar en el grupo de WhatsApp: fecha, cancha, cupos, lista
 * numerada y el link para confirmar. Usa el *negrita* de WhatsApp.
 */
export function matchCallMessage(input: MatchCallInput): string {
  const free = Math.max(0, input.capacity - input.confirmed.length);
  const lines = [`⚽ *${input.groupName}* · ${input.whenLabel}`];
  if (input.venue) lines.push(`📍 ${input.venue}`);
  lines.push(
    free > 0
      ? `Somos ${input.confirmed.length} de ${input.capacity}: ${free === 1 ? "falta 1" : `faltan ${free}`}.`
      : `Completo (${input.capacity}/${input.capacity}). Si confirmás, quedás de suplente.`,
  );
  if (input.confirmed.length > 0) {
    lines.push("", ...input.confirmed.map((name, i) => `${i + 1}. ${name}`));
  }
  if (input.reserves.length > 0) {
    lines.push("", "Suplentes:", ...input.reserves.map((name, i) => `${i + 1}. ${name}`));
  }
  lines.push("", `Confirmá si vas o no acá 👉 ${input.url}`);
  return lines.join("\n");
}

/** Link que abre WhatsApp con el mensaje listo para elegir el chat. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
