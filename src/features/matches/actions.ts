"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { after } from "next/server";
import { zonedDateTimeToIso } from "@/domain/matches/datetime";
import { orderForSave } from "@/domain/matches/participants";
import { cleanTeamName } from "@/domain/matches/teams";
import { normalizeName } from "@/domain/names/normalize";
import { type ActionState, errorState, formValues, parseForm } from "@/lib/action-result";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { dispatchPush } from "@/features/notifications/send";
import {
  attendanceSchema,
  createMatchSchema,
  importPlayersSchema,
  matchRefSchema,
  matchStatusSchema,
  recordResultSchema,
  setParticipantsSchema,
  setTeamsSchema,
  updateMatchSchema,
} from "./schemas";

/** Slug y zona horaria del grupo (RLS: solo si sos miembro). */
async function groupInfo(groupId: string): Promise<{ slug: string; timezone: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("slug, timezone").eq("id", groupId).maybeSingle();
  return data ?? null;
}

/**
 * Slug del grupo al que pertenece el partido (RLS: solo si sos miembro). Para
 * redirigir después de una RPC que recibe solo el partido: el groupId que
 * manda el cliente no se usa para decidir a dónde volver.
 */
async function matchGroupSlug(matchId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("group_id").eq("id", matchId).maybeSingle();
  if (!data) return null;
  return (await groupInfo(data.group_id))?.slug ?? null;
}

/** Todo lo del grupo depende de los partidos (inicio, listas, fichas). */
function revalidateGroup() {
  revalidatePath("/g/[slug]", "layout");
}

const toRpcParticipants = (list: Array<{ playerId: string; status: "confirmed" | "reserve" }>) =>
  orderForSave(list).map((p) => ({ player_id: p.playerId, status: p.status }));

/**
 * Crea las fichas nuevas que el admin confirmó al importar una lista y
 * guarda alias para las coincidencias que eligió a mano. Es idempotente:
 * si una ficha con ese apodo ya existe (p. ej. un reintento), la reutiliza.
 * Devuelve apodo normalizado → id.
 */
export async function addPlayersFromImportAction(input: unknown): Promise<MutationResult<{ ids: Record<string, string> }>> {
  const parsed = importPlayersSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { groupId, players, aliases } = parsed.data;

  const supabase = await createClient();
  const ids: Record<string, string> = {};

  if (players.length > 0) {
    const { data: existing, error } = await supabase.from("players").select("id, nickname").eq("group_id", groupId);
    if (error) return fail(toUserMessage(error));
    const byName = new Map(existing.map((p) => [normalizeName(p.nickname), p.id]));

    for (const { nickname } of players) {
      const key = normalizeName(nickname)!;
      const found = byName.get(key);
      if (found) {
        ids[key] = found;
        continue;
      }
      const { data: playerId, error: saveError } = await supabase.rpc("save_player", {
        p_group_id: groupId,
        p_nickname: nickname,
      });
      if (saveError || !playerId) return fail(toUserMessage(saveError));
      ids[key] = playerId;
      byName.set(key, playerId);
    }
  }

  for (const { playerId, alias } of aliases) {
    const { error } = await supabase.from("player_aliases").insert({ group_id: groupId, player_id: playerId, alias });
    // Un alias repetido no es un problema: ya estaba recordado.
    if (error && error.code !== "23505") return fail(toUserMessage(error));
  }

  if (players.length > 0 || aliases.length > 0) revalidateGroup();
  return ok(undefined, { ids });
}

/** Alta de partido con su convocatoria (admin). */
export async function createMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(createMatchSchema, formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.data;

  const group = await groupInfo(v.groupId);
  if (!group) return errorState(toUserMessage({ message: "group_not_found" }));

  const supabase = await createClient();
  const { data: matchId, error } = await supabase.rpc("create_match", {
    p_group_id: v.groupId,
    p_scheduled_at: zonedDateTimeToIso(v.date, v.time, group.timezone),
    p_players_per_team: v.playersPerTeam,
    p_venue: v.venue,
    p_notes: v.notes,
    p_participants: toRpcParticipants(v.participants),
  });
  if (error || !matchId) return errorState(toUserMessage(error), { values: formValues(formData) });

  after(() => dispatchPush(supabase, "match_created", matchId));
  revalidateGroup();
  redirect(`${routes.match(group.slug, matchId)}?creado=1`, RedirectType.replace);
}

/** Edición de fecha, hora, cancha, formato y notas (admin). */
export async function updateMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(updateMatchSchema, formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.data;

  const group = await groupInfo(v.groupId);
  if (!group) return errorState(toUserMessage({ message: "group_not_found" }));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({
      scheduled_at: zonedDateTimeToIso(v.date, v.time, group.timezone),
      venue: v.venue ?? null,
      players_per_team: v.playersPerTeam,
      notes: v.notes ?? null,
    })
    .eq("id", v.matchId)
    .eq("group_id", v.groupId)
    .select("id")
    .maybeSingle();
  if (error) return errorState(toUserMessage(error), { values: formValues(formData) });
  if (!data) return errorState(toUserMessage({ message: "forbidden" }));

  revalidateGroup();
  redirect(`${routes.match(group.slug, v.matchId)}?editado=1`, RedirectType.replace);
}

const STATUS_MESSAGES = {
  scheduled: "El partido volvió a estar programado.",
  in_progress: "Partido en curso.",
  cancelled: "Partido cancelado.",
} as const;

/** En curso, cancelado o de vuelta a programado (finalizar es solo con el resultado). */
export async function setMatchStatusAction(input: unknown): Promise<MutationResult> {
  const parsed = matchStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { groupId, matchId, status } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId)
    .eq("group_id", groupId)
    .neq("status", "finished")
    .select("id")
    .maybeSingle();
  if (error) return fail(toUserMessage(error));
  if (!data) return fail(toUserMessage({ message: "match_locked" }));

  revalidateGroup();
  return ok(STATUS_MESSAGES[status]);
}

/** Borra un partido no jugado (la política de la base lo impide si está finalizado). */
export async function deleteMatchAction(input: unknown): Promise<MutationResult> {
  const parsed = matchRefSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { groupId, matchId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.from("matches").delete().eq("id", matchId).eq("group_id", groupId).select("id");
  if (error) return fail(toUserMessage(error));
  if (!data?.length) return fail("Un partido jugado no se puede eliminar.");

  const group = await groupInfo(groupId);
  revalidateGroup();
  if (group) redirect(`${routes.groupMatches(group.slug)}?eliminado=1`, RedirectType.replace);
  return ok("Partido eliminado.");
}

/** Reemplaza la convocatoria (titulares y suplentes, en orden). */
export async function setParticipantsAction(input: unknown): Promise<MutationResult> {
  const parsed = setParticipantsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { matchId, participants } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_match_participants", {
    p_match_id: matchId,
    p_participants: toRpcParticipants(participants),
  });
  if (error) return fail(toUserMessage(error));

  revalidateGroup();
  return ok("Convocatoria actualizada.");
}

/** Guarda los dos equipos. En un partido jugado es una corrección auditada. */
export async function setTeamsAction(input: unknown): Promise<MutationResult> {
  const parsed = setTeamsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { matchId, teamA, teamB, nameA, nameB } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_match_teams", {
    p_match_id: matchId,
    p_team_a: teamA,
    p_team_b: teamB,
    p_name_a: cleanTeamName(nameA ?? "", "a"),
    p_name_b: cleanTeamName(nameB ?? "", "b"),
  });
  if (error) return fail(toUserMessage(error));

  const slug = await matchGroupSlug(matchId);
  revalidateGroup();
  if (slug) redirect(`${routes.match(slug, matchId)}?equipos=1`, RedirectType.replace);
  return ok("Equipos guardados.");
}

/** Carga o corrige el resultado completo en una transacción (RPC). */
export async function recordResultAction(input: unknown): Promise<MutationResult> {
  const parsed = recordResultSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_match_result", {
    p_match_id: v.matchId,
    p_score_a: v.scoreA,
    p_score_b: v.scoreB,
    p_events: v.events,
    p_mvp_player_id: v.mvpPlayerId ?? undefined,
    p_notes: v.notes,
  });
  if (error) return fail(toUserMessage(error));

  after(() => dispatchPush(supabase, "voting_open", v.matchId));
  const slug = await matchGroupSlug(v.matchId);
  revalidateGroup();
  if (slug) redirect(`${routes.match(slug, v.matchId)}?resultado=1`, RedirectType.replace);
  return ok("Resultado guardado.");
}

const ATTENDANCE_MESSAGES = {
  confirmed: "¡Listo, estás confirmado!",
  reserve: "El partido está completo: quedaste de suplente.",
  dropped: "Avisaste que no vas.",
} as const;

/** "Voy / No voy" del jugador de la cuenta actual. */
export async function setMyAttendanceAction(
  input: unknown,
): Promise<MutationResult<{ status: keyof typeof ATTENDANCE_MESSAGES }>> {
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_my_attendance", {
    p_match_id: parsed.data.matchId,
    p_going: parsed.data.going,
  });
  if (error || !data) return fail(toUserMessage(error));

  revalidateGroup();
  return ok(ATTENDANCE_MESSAGES[data], { status: data });
}
