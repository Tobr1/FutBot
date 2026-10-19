/**
 * Revisión de una lista de WhatsApp antes de crear el partido. El importador
 * (src/domain/lineup-import) sugiere; acá el admin decide fila por fila y
 * nada se crea hasta que confirma: lo resuelto se convierte en convocatoria,
 * fichas nuevas y alias para la próxima vez.
 */
import type { LineupSection, MatchCandidate, MatchedEntry, MatchStatus } from "@/domain/lineup-import";
import { normalizeName } from "@/domain/names/normalize";
import type { ParticipantStatus } from "./status";

export type ReviewDecision =
  | { kind: "pending" }
  | { kind: "existing"; playerId: string }
  | { kind: "new"; nickname: string }
  | { kind: "ignore" };

export interface ReviewRow {
  key: string;
  /** Nombre tal como vino en la lista (limpio). */
  name: string;
  section: LineupSection;
  /** Lo que sugirió el importador. */
  suggestion: MatchStatus;
  candidates: MatchCandidate[];
  decision: ReviewDecision;
}

export const NICKNAME_MAX = 30;

/** Las coincidencias seguras ya quedan elegidas; lo dudoso y lo nuevo, pendiente. */
export function initialReview(entries: readonly MatchedEntry[]): ReviewRow[] {
  return entries.map((entry, index) => ({
    key: `${index}:${entry.name}`,
    name: entry.name,
    section: entry.section,
    suggestion: entry.status,
    candidates: entry.candidates,
    decision: entry.status === "matched" && entry.playerId ? { kind: "existing", playerId: entry.playerId } : { kind: "pending" },
  }));
}

export interface RosterRef {
  id: string;
  nickname: string;
  fullName?: string | null;
  aliases?: string[];
}

/** Problemas por fila (clave → mensaje) que impiden aplicar la lista. */
export function reviewIssues(rows: readonly ReviewRow[], roster: readonly RosterRef[]): Map<string, string> {
  const issues = new Map<string, string>();
  const chosen = new Map<string, string>();
  const newNames = new Map<string, string>();
  const rosterNames = new Map<string, string>();
  for (const player of roster) {
    const key = normalizeName(player.nickname);
    if (key) rosterNames.set(key, player.nickname);
  }

  for (const row of rows) {
    const decision = row.decision;
    if (decision.kind === "existing") {
      const first = chosen.get(decision.playerId);
      if (first) issues.set(row.key, `Ya elegiste a ese jugador para "${first}".`);
      else chosen.set(decision.playerId, row.name);
    } else if (decision.kind === "new") {
      const normalized = normalizeName(decision.nickname);
      if (!normalized) {
        issues.set(row.key, "El apodo tiene que tener letras o números.");
      } else if (decision.nickname.trim().length > NICKNAME_MAX) {
        issues.set(row.key, `Usá como máximo ${NICKNAME_MAX} caracteres.`);
      } else if (rosterNames.has(normalized)) {
        issues.set(row.key, `Ya existe ${rosterNames.get(normalized)} en el plantel: elegilo de la lista.`);
      } else if (newNames.has(normalized)) {
        issues.set(row.key, `Repetido con "${newNames.get(normalized)}".`);
      } else {
        newNames.set(normalized, row.name);
      }
    }
  }
  return issues;
}

export interface ReviewProgress {
  pending: number;
  existing: number;
  created: number;
  ignored: number;
}

export function reviewProgress(rows: readonly ReviewRow[]): ReviewProgress {
  const progress: ReviewProgress = { pending: 0, existing: 0, created: 0, ignored: 0 };
  for (const row of rows) {
    if (row.decision.kind === "pending") progress.pending += 1;
    else if (row.decision.kind === "existing") progress.existing += 1;
    else if (row.decision.kind === "new") progress.created += 1;
    else progress.ignored += 1;
  }
  return progress;
}

export type ConvocationEntry =
  | { kind: "player"; playerId: string; status: ParticipantStatus }
  | { kind: "new"; nickname: string; status: ParticipantStatus };

export interface ResolvedReview {
  entries: ConvocationEntry[];
  /** Nombres de la lista que conviene recordar como alias del jugador elegido. */
  aliases: Array<{ playerId: string; alias: string }>;
}

/**
 * Convierte la revisión (sin pendientes ni problemas) en convocatoria.
 * Guarda como alias solo las elecciones que el importador no resolvió solo
 * y cuyo nombre no coincide ya con el apodo, el nombre completo o un alias.
 */
export function resolveReview(rows: readonly ReviewRow[], roster: readonly RosterRef[]): ResolvedReview {
  const byId = new Map(roster.map((p) => [p.id, p]));
  const taken = new Set<string>();
  for (const player of roster) {
    const key = normalizeName(player.nickname);
    if (key) taken.add(key);
  }

  const entries: ConvocationEntry[] = [];
  const aliases: ResolvedReview["aliases"] = [];
  const aliasKeys = new Set<string>();

  for (const row of rows) {
    const status: ParticipantStatus = row.section === "reserve" ? "reserve" : "confirmed";
    const decision = row.decision;
    if (decision.kind === "existing") {
      entries.push({ kind: "player", playerId: decision.playerId, status });
      if (row.suggestion === "matched") continue;
      const player = byId.get(decision.playerId);
      const alias = normalizeName(row.name);
      if (!player || !alias || taken.has(alias) || aliasKeys.has(alias)) continue;
      const known = [player.fullName, ...(player.aliases ?? [])].map((value) => normalizeName(value));
      if (known.includes(alias)) continue;
      aliasKeys.add(alias);
      aliases.push({ playerId: player.id, alias: row.name.trim().slice(0, 40) });
    } else if (decision.kind === "new") {
      entries.push({ kind: "new", nickname: decision.nickname.trim().replace(/\s+/g, " "), status });
    }
  }
  return { entries, aliases };
}
