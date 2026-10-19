/**
 * Estados del partido y qué se puede hacer en cada uno. Espeja las reglas de
 * la base (matches_guard_direct_update, set_match_participants,
 * set_match_teams, record_match_result y la política de borrado).
 */
import type { Enums } from "@/types/database";

export type MatchStatus = Enums<"match_status">;
export type ParticipantStatus = Extract<Enums<"participant_status">, "confirmed" | "reserve">;

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Programado",
  in_progress: "En curso",
  finished: "Jugado",
  cancelled: "Cancelado",
};

export type StatusTone = "primary" | "success" | "neutral" | "destructive" | "warning";

export const MATCH_STATUS_TONE: Record<MatchStatus, StatusTone> = {
  scheduled: "primary",
  in_progress: "success",
  finished: "neutral",
  cancelled: "destructive",
};

/** Programado o en curso: va en "Próximos". */
export function isOpenMatch(status: MatchStatus): boolean {
  return status === "scheduled" || status === "in_progress";
}

/** Partido abierto cuya hora ya pasó: le falta el resultado. */
export function needsResult(status: MatchStatus, scheduledAt: string, nowMs: number): boolean {
  return isOpenMatch(status) && Date.parse(scheduledAt) <= nowMs;
}

/** La convocatoria se cierra al terminar o cancelar el partido. */
export function canEditParticipants(status: MatchStatus): boolean {
  return isOpenMatch(status);
}

/** Los equipos se pueden tocar siempre salvo cancelado (en jugado es corrección). */
export function canEditTeams(status: MatchStatus): boolean {
  return status !== "cancelled";
}

/** El resultado necesita los dos equipos armados y un partido no cancelado. */
export function canRecordResult(status: MatchStatus, teamsReady: boolean): boolean {
  return status !== "cancelled" && teamsReady;
}

/** Un partido jugado no se borra (conserva estadísticas). */
export function canDeleteMatch(status: MatchStatus): boolean {
  return status !== "finished";
}

/** Estados a los que un admin puede pasar con una edición directa. */
export type ManualStatus = Exclude<MatchStatus, "finished">;

export function allowedStatusChanges(status: MatchStatus): ManualStatus[] {
  switch (status) {
    case "scheduled":
      return ["in_progress", "cancelled"];
    case "in_progress":
      return ["scheduled", "cancelled"];
    case "cancelled":
      return ["scheduled"];
    case "finished":
      return [];
  }
}

/** Convocados necesarios para completar los dos equipos. */
export function squadSize(playersPerTeam: number): number {
  return playersPerTeam * 2;
}

/** "F5", "F7"… */
export function formatLabel(playersPerTeam: number): string {
  return `F${playersPerTeam}`;
}

export interface ParticipantCounts {
  confirmed: number;
  reserve: number;
}

export function countParticipants(list: ReadonlyArray<{ status: string }>): ParticipantCounts {
  let confirmed = 0;
  let reserve = 0;
  for (const p of list) {
    if (p.status === "confirmed") confirmed += 1;
    else if (p.status === "reserve") reserve += 1;
  }
  return { confirmed, reserve };
}
