/**
 * Registro de cambios en castellano. Traduce las filas de audit_logs (que
 * escriben los triggers y las RPC) a frases cortas en tercera persona; la
 * UI antepone quién lo hizo: "Brito" + "cargó el resultado 3–2…".
 * Devuelve null para las filas que ya cubre otra (p. ej. el UPDATE de la
 * tabla matches que acompaña a result_recorded).
 */

export type AuditCategory = "match" | "result" | "teams" | "player" | "member" | "group" | "season" | "invite" | "other";

export interface AuditRow {
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

export interface AuditContext {
  /** "Sáb 25/10" para un instante ISO (en la zona del grupo). */
  formatDay: (iso: string) => string;
  /** Fecha del partido por id (para filas de resultado), si sigue existiendo. */
  matchScheduledAt?: (matchId: string) => string | null;
  /** Nombre visible de una cuenta. */
  profileName?: (profileId: string) => string | null;
}

export interface AuditDescription {
  text: string;
  category: AuditCategory;
}

const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const num = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const formatRating = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","));

function changed(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null, key: string): boolean {
  return JSON.stringify(oldData?.[key] ?? null) !== JSON.stringify(newData?.[key] ?? null);
}

/** "Sáb 25/10" del partido de la fila, o null si ya no existe. */
function matchDay(row: AuditRow, ctx: AuditContext): string | null {
  const iso =
    str(row.newData?.scheduled_at) ??
    str(row.oldData?.scheduled_at) ??
    (row.entityId && ctx.matchScheduledAt ? ctx.matchScheduledAt(row.entityId) : null);
  return iso ? ctx.formatDay(iso) : null;
}

/** "del partido del Sáb 25/10" o "de un partido eliminado". */
function matchRef(row: AuditRow, ctx: AuditContext): string {
  const day = matchDay(row, ctx);
  return day ? `del partido del ${day}` : "de un partido eliminado";
}

function describeMatch(row: AuditRow, ctx: AuditContext): AuditDescription | null {
  const ref = matchRef(row, ctx);
  const day = matchDay(row, ctx);
  const the = day ? `el partido del ${day}` : "un partido";
  const op = row.action;
  if (op === "insert") return { text: `creó ${the}`, category: "match" };
  if (op === "delete") return { text: `eliminó ${the}`, category: "match" };
  if (op !== "update") return null;

  const { oldData, newData } = row;
  const oldStatus = str(oldData?.status);
  const newStatus = str(newData?.status);
  const editable = ["scheduled_at", "venue", "players_per_team", "notes"].filter((key) => changed(oldData, newData, key));

  // Lo registra result_recorded/result_corrected con más detalle.
  if (newStatus === "finished" && (oldStatus !== "finished" || editable.every((key) => key === "notes"))) return null;

  if (oldStatus !== newStatus) {
    if (newStatus === "cancelled") return { text: `canceló ${the}`, category: "match" };
    if (newStatus === "in_progress") return { text: `marcó en curso ${the}`, category: "match" };
    if (newStatus === "scheduled" && oldStatus === "cancelled") return { text: `reactivó ${the}`, category: "match" };
    if (newStatus === "scheduled") return { text: `volvió a programar ${the}`, category: "match" };
  }
  if (editable.includes("scheduled_at")) {
    const before = str(oldData?.scheduled_at);
    const after = str(newData?.scheduled_at);
    if (before && after) {
      return { text: `cambió la fecha de un partido: ${ctx.formatDay(before)} → ${ctx.formatDay(after)}`, category: "match" };
    }
  }
  if (editable.length === 0) return null;
  return { text: `editó los datos ${ref}`, category: "match" };
}

function describeResult(row: AuditRow, ctx: AuditContext): AuditDescription {
  const ref = matchRef(row, ctx);
  const a = num(row.newData?.score_a);
  const b = num(row.newData?.score_b);
  const score = a !== null && b !== null ? ` ${a}–${b}` : "";
  if (row.action === "result_recorded") return { text: `cargó el resultado${score} ${ref}`, category: "result" };

  const oa = num(row.oldData?.score_a);
  const ob = num(row.oldData?.score_b);
  if (oa !== null && ob !== null && a !== null && b !== null && (oa !== a || ob !== b)) {
    return { text: `corrigió el resultado ${ref}: ${oa}–${ob} → ${a}–${b}`, category: "result" };
  }
  return { text: `corrigió goles, asistencias o destacado ${ref}`, category: "result" };
}

function describePlayer(row: AuditRow): AuditDescription | null {
  const { oldData, newData } = row;
  const nickname = str(newData?.nickname) ?? str(oldData?.nickname) ?? "un jugador";
  if (row.action === "insert") return { text: `agregó a ${nickname} al plantel`, category: "player" };
  if (row.action === "delete") return { text: `eliminó la ficha de ${nickname}`, category: "player" };
  if (row.action !== "update") return null;

  if (changed(oldData, newData, "is_active")) {
    return { text: newData?.is_active ? `reactivó a ${nickname}` : `desactivó a ${nickname}`, category: "player" };
  }
  if (changed(oldData, newData, "profile_id")) {
    return {
      text: newData?.profile_id ? `vinculó la ficha de ${nickname} a una cuenta` : `desvinculó la ficha de ${nickname}`,
      category: "player",
    };
  }
  if (changed(oldData, newData, "nickname")) {
    const before = str(oldData?.nickname);
    return { text: before ? `renombró a ${before} como ${nickname}` : `cambió el apodo de ${nickname}`, category: "player" };
  }
  if (changed(oldData, newData, "base_rating")) {
    const before = num(oldData?.base_rating);
    const after = num(newData?.base_rating);
    const detail = before !== null && after !== null ? ` (${formatRating(before)} → ${formatRating(after)})` : "";
    return { text: `cambió el nivel inicial de ${nickname}${detail}`, category: "player" };
  }
  return { text: `editó la ficha de ${nickname}`, category: "player" };
}

function describeMember(row: AuditRow, ctx: AuditContext): AuditDescription | null {
  const profileId = str(row.newData?.profile_id) ?? str(row.oldData?.profile_id);
  const self = profileId !== null && profileId === row.actorId;
  const name = (profileId && ctx.profileName?.(profileId)) || "un miembro";
  if (row.action === "insert") return { text: self ? "se sumó al grupo" : `sumó a ${name} al grupo`, category: "member" };
  if (row.action === "delete") return { text: self ? "salió del grupo" : `quitó a ${name} del grupo`, category: "member" };
  if (row.action === "update" && changed(row.oldData, row.newData, "role")) {
    return {
      text: row.newData?.role === "admin" ? `hizo administrador a ${name}` : `pasó a ${name} a jugador`,
      category: "member",
    };
  }
  return null;
}

function describeSeason(row: AuditRow): AuditDescription | null {
  const name = str(row.newData?.name) ?? str(row.oldData?.name) ?? "una temporada";
  if (row.action === "insert") return { text: `abrió la temporada ${name}`, category: "season" };
  if (row.action === "delete") return { text: `eliminó la temporada ${name}`, category: "season" };
  if (row.action !== "update") return null;
  if (!row.oldData?.ends_on && row.newData?.ends_on) return { text: `cerró la temporada ${name}`, category: "season" };
  return { text: `editó la temporada ${name}`, category: "season" };
}

function describeInvitation(row: AuditRow): AuditDescription | null {
  if (row.action === "insert") return { text: "creó un link de invitación", category: "invite" };
  if (row.action === "delete") return { text: "eliminó un link de invitación", category: "invite" };
  if (row.action !== "update") return null;
  if (!row.oldData?.revoked_at && row.newData?.revoked_at) return { text: "revocó un link de invitación", category: "invite" };
  if ((num(row.newData?.use_count) ?? 0) > (num(row.oldData?.use_count) ?? 0)) {
    return { text: "entró con un link de invitación", category: "invite" };
  }
  return { text: "editó un link de invitación", category: "invite" };
}

export function describeAudit(row: AuditRow, ctx: AuditContext): AuditDescription | null {
  if (row.action === "result_recorded" || row.action === "result_corrected") return describeResult(row, ctx);
  if (row.action === "teams_corrected") return { text: `corrigió los equipos ${matchRef(row, ctx)}`, category: "teams" };

  switch (row.entityType) {
    case "matches":
      return describeMatch(row, ctx);
    case "players":
      return describePlayer(row);
    case "group_members":
      return describeMember(row, ctx);
    case "groups":
      return row.action === "update" ? { text: "editó los datos del grupo", category: "group" } : null;
    case "seasons":
      return describeSeason(row);
    case "invitations":
      return describeInvitation(row);
    case "team_constraints":
      if (row.action === "insert") return { text: "agregó una regla para armar equipos", category: "teams" };
      if (row.action === "delete") return { text: "quitó una regla para armar equipos", category: "teams" };
      return { text: "editó una regla para armar equipos", category: "teams" };
    default:
      return { text: "hizo un cambio en el grupo", category: "other" };
  }
}
