/**
 * Reglas de la votación anónima (docs/ANALISIS.md §6.2 y D-008). Espeja a
 * `submit_match_ratings` y `get_voting_progress`: se vota un partido jugado,
 * hasta `voting_closes_at`, a todos los que jugaron menos a uno mismo.
 * Todo es puro: el "ahora" siempre llega por parámetro.
 */

import type { MatchStatus } from "@/domain/matches/status";

export type VoteSide = "a" | "b";

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
export const SCORES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

/** pending: el partido no terminó (o no tiene cierre) · open: se puede votar · closed: publicada. */
export type VotingPhase = "pending" | "open" | "closed";

export function votingPhase(status: MatchStatus, votingClosesAt: string | null, nowMs: number): VotingPhase {
  if (status !== "finished" || !votingClosesAt) return "pending";
  const closes = Date.parse(votingClosesAt);
  if (!Number.isFinite(closes)) return "pending";
  return nowMs < closes ? "open" : "closed";
}

/** Calificación válida: entero de 1 a 10. */
export function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= SCORE_MIN && value <= SCORE_MAX;
}

/** Texto corto del tiempo que falta: "45 min", "5 h 20 min", "1 día 3 h". */
export function timeLeftLabel(closesAtIso: string, nowMs: number): string {
  const diff = Date.parse(closesAtIso) - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return "0 min";
  const totalMinutes = Math.floor(diff / 60_000);
  if (totalMinutes < 1) return "menos de 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) return minutes > 0 ? `${totalHours} h ${minutes} min` : `${totalHours} h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const dayText = `${days} ${days === 1 ? "día" : "días"}`;
  return hours > 0 ? `${dayText} ${hours} h` : dayText;
}

/** "Cierra en 5 h 20 min" o "Votación cerrada". */
export function closesInLabel(closesAtIso: string, nowMs: number): string {
  return Date.parse(closesAtIso) > nowMs ? `Cierra en ${timeLeftLabel(closesAtIso, nowMs)}` : "Votación cerrada";
}

/** El cierre está cerca (menos de 3 h): se resalta. */
export function closesSoon(closesAtIso: string, nowMs: number, thresholdHours = 3): boolean {
  const diff = Date.parse(closesAtIso) - nowMs;
  return Number.isFinite(diff) && diff > 0 && diff <= thresholdHours * 3_600_000;
}

/** "3 de 8 calificados". */
export function ratedProgressLabel(rated: number, total: number): string {
  return `${Math.min(rated, total)} de ${total} calificados`;
}

/** "4 de 9 ya votaron" (solo cantidades: nunca quién). */
export function votersLabel(voters: number, eligible: number): string {
  if (eligible <= 0) return "Nadie con cuenta jugó este partido";
  if (voters <= 0) return `Todavía no votó nadie (pueden ${eligible})`;
  return `${Math.min(voters, eligible)} de ${eligible} ${voters === 1 ? "ya votó" : "ya votaron"}`;
}

/** Porcentaje entero (0-100) para barras de progreso. */
export function progressPercent(done: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((Math.min(Math.max(done, 0), total) / total) * 100);
}

/** Pista que acompaña a la calificación elegida. */
export function scoreHint(score: number): string {
  if (score >= 10) return "Crack";
  if (score >= 8) return "Figura";
  if (score >= 7) return "Muy bien";
  if (score >= 6) return "Bien";
  if (score >= 4) return "Regular";
  return "Flojo";
}

export interface VoteTargets {
  /** Equipo de quien vota; null si no jugó. */
  mySide: VoteSide | null;
  teammates: string[];
  rivals: string[];
}

/**
 * A quiénes califica un jugador: compañeros y rivales, sin él mismo y sin
 * repetidos. Si no jugó, no califica a nadie.
 */
export function voteTargets(teams: Record<VoteSide, readonly string[]>, me: string | null): VoteTargets {
  const mySide: VoteSide | null = me ? (teams.a.includes(me) ? "a" : teams.b.includes(me) ? "b" : null) : null;
  if (!mySide) return { mySide: null, teammates: [], rivals: [] };
  const rivalSide: VoteSide = mySide === "a" ? "b" : "a";
  const unique = (ids: readonly string[]) => [...new Set(ids)].filter((id) => id !== me);
  const teammates = unique(teams[mySide]);
  const mates = new Set(teammates);
  return { mySide, teammates, rivals: unique(teams[rivalSide]).filter((id) => !mates.has(id)) };
}

export type RatingDraft = Record<string, number | null | undefined>;

export interface RatingPayloadItem {
  playerId: string;
  score: number;
}

/** Votos listos para enviar: solo jugadores habilitados y calificaciones válidas. */
export function ratingsPayload(draft: RatingDraft, allowed: Iterable<string>): RatingPayloadItem[] {
  const out: RatingPayloadItem[] = [];
  for (const playerId of allowed) {
    const score = draft[playerId];
    if (isValidScore(score)) out.push({ playerId, score });
  }
  return out;
}

/** Cantidad de calificaciones nuevas o cambiadas respecto de lo ya enviado. */
export function changedCount(draft: RatingDraft, saved: Readonly<Record<string, number>>, allowed: Iterable<string>): number {
  let count = 0;
  for (const id of allowed) {
    const score = draft[id];
    if (isValidScore(score) && saved[id] !== score) count += 1;
  }
  return count;
}

export interface PendingVoteInput {
  members: readonly string[];
  me: string;
  ratedIds: readonly string[];
}

/** Le quedan jugadores por calificar (juega el partido y no calificó a todos). */
export function hasPendingVotes({ members, me, ratedIds }: PendingVoteInput): boolean {
  if (!members.includes(me)) return false;
  const rated = new Set(ratedIds);
  return members.some((id) => id !== me && !rated.has(id));
}
