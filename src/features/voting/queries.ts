import "server-only";
import { cache } from "react";
import { type MyVotingState, myVotingState } from "@/domain/voting/list";
import { hasPendingVotes } from "@/domain/voting/voting";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface VotingProgress {
  /** Jugadores del partido con cuenta vinculada. */
  eligibleVoters: number;
  /** Cuántos votaron (solo la cantidad: nunca quiénes). */
  voters: number;
  closesAt: string | null;
  isOpen: boolean;
}

/** Progreso de la votación de un partido (`get_voting_progress`). */
export const getVotingProgress = cache(async (matchId: string): Promise<VotingProgress | null> => {
  if (!UUID.test(matchId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_voting_progress", { p_match_id: matchId });
  if (error) throw error;
  const row = data[0];
  if (!row) return null;
  return {
    eligibleVoters: row.eligible_voters ?? 0,
    voters: row.voters ?? 0,
    closesAt: row.closes_at,
    isOpen: row.is_open ?? false,
  };
});

/**
 * Votos propios en un partido (RLS: cada cuenta solo ve los suyos), para
 * precargar el formulario y editar hasta el cierre.
 */
export const getMyVotes = cache(async (matchId: string, myPlayerId: string): Promise<Record<string, number>> => {
  if (!UUID.test(matchId)) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_ratings")
    .select("rated_player_id, score")
    .eq("match_id", matchId)
    .eq("rater_player_id", myPlayerId);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.rated_player_id, r.score]));
});

/** Mi voto al MVP en un partido (RLS: solo el propio), o null. */
export const getMyMvpVote = cache(async (matchId: string, myPlayerId: string): Promise<string | null> => {
  if (!UUID.test(matchId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_mvp_votes")
    .select("candidate_player_id")
    .eq("match_id", matchId)
    .eq("voter_player_id", myPlayerId)
    .maybeSingle();
  if (error) throw error;
  return data?.candidate_player_id ?? null;
});

export interface PendingVoting {
  matchId: string;
  scheduledAt: string;
  closesAt: string;
  rated: number;
  total: number;
}

/**
 * Votaciones abiertas del grupo en las que jugué y me falta calificar a
 * alguien (para el aviso del inicio). `nowIso` llega después de connection().
 */
export async function listPendingVotings(groupId: string, myPlayerId: string, nowIso: string): Promise<PendingVoting[]> {
  const supabase = await createClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, scheduled_at, voting_closes_at")
    .eq("group_id", groupId)
    .eq("status", "finished")
    .gt("voting_closes_at", nowIso)
    .order("voting_closes_at", { ascending: true })
    .limit(10);
  if (error) throw error;
  if (matches.length === 0) return [];

  const ids = matches.map((m) => m.id);
  const [members, mine] = await Promise.all([
    supabase.from("team_members").select("match_id, player_id").in("match_id", ids),
    supabase.from("match_ratings").select("match_id, rated_player_id").in("match_id", ids).eq("rater_player_id", myPlayerId),
  ]);
  if (members.error) throw members.error;
  if (mine.error) throw mine.error;

  const membersByMatch = new Map<string, string[]>();
  for (const m of members.data) membersByMatch.set(m.match_id, [...(membersByMatch.get(m.match_id) ?? []), m.player_id]);
  const ratedByMatch = new Map<string, string[]>();
  for (const r of mine.data) ratedByMatch.set(r.match_id, [...(ratedByMatch.get(r.match_id) ?? []), r.rated_player_id]);

  return matches.flatMap((m) => {
    const list = membersByMatch.get(m.id) ?? [];
    const ratedIds = ratedByMatch.get(m.id) ?? [];
    if (!m.voting_closes_at || !hasPendingVotes({ members: list, me: myPlayerId, ratedIds })) return [];
    return [{ matchId: m.id, scheduledAt: m.scheduled_at, closesAt: m.voting_closes_at, rated: ratedIds.length, total: list.length - 1 }];
  });
}

/**
 * Al ver un partido con la votación cerrada: fija el MVP por votos si nadie
 * lo eligió (idempotente). Devuelve el MVP resultante o null.
 */
export async function finalizeVoting(matchId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_match_voting", { p_match_id: matchId });
  if (error) return null;
  return data ?? null;
}

export interface MyPendingVoting extends PendingVoting {
  groupSlug: string;
  groupName: string;
  timeZone: string;
}

/**
 * Votaciones abiertas con calificaciones pendientes en todos mis grupos (para
 * Mis grupos), de la que cierra antes a la que cierra después. `nowIso`
 * llega después de connection().
 */
export async function listMyPendingVotings(nowIso: string): Promise<MyPendingVoting[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: players, error } = await supabase.from("players").select("id, group_id").eq("profile_id", user.id);
  if (error) throw error;
  if (players.length === 0) return [];

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, slug, name, timezone")
    .in(
      "id",
      players.map((p) => p.group_id),
    );
  if (groupsError) throw groupsError;
  const byId = new Map(groups.map((g) => [g.id, g]));

  const lists = await Promise.all(
    players.map(async (p) => {
      const group = byId.get(p.group_id);
      if (!group) return [];
      const pending = await listPendingVotings(group.id, p.id, nowIso);
      return pending.map((v) => ({ ...v, groupSlug: group.slug, groupName: group.name, timeZone: group.timezone }));
    }),
  );
  return lists.flat().sort((x, y) => (x.closesAt < y.closesAt ? -1 : x.closesAt > y.closesAt ? 1 : 0));
}

export interface GroupVoting {
  matchId: string;
  scheduledAt: string;
  closesAt: string;
  teams: { a: { name: string; score: number | null }; b: { name: string; score: number | null } };
  state: MyVotingState;
  /** A quiénes califiqué / a cuántos tengo que calificar (si jugué). */
  rated: number;
  total: number;
  /** Solo en las abiertas: cuántos votaron de cuántos pueden (nunca quiénes). */
  progress: { voters: number; eligible: number } | null;
  /** Solo en las cerradas. */
  mvpNickname: string | null;
}

/**
 * Votaciones del grupo (las últimas 30 con votación), con mi estado en cada
 * una. `myPlayerId` null: no tengo ficha, solo miro. `nowIso` llega después
 * de connection(). Nunca trae notas: solo cantidades propias y agregadas.
 */
export async function listGroupVotings(groupId: string, myPlayerId: string | null, nowIso: string): Promise<GroupVoting[]> {
  const supabase = await createClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, scheduled_at, voting_closes_at, mvp_player_id, teams!teams_match_fkey(side, name, score)")
    .eq("group_id", groupId)
    .eq("status", "finished")
    .not("voting_closes_at", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  if (matches.length === 0) return [];

  const ids = matches.map((m) => m.id);
  const nowMs = Date.parse(nowIso);
  const openIds = matches.filter((m) => m.voting_closes_at && Date.parse(m.voting_closes_at) > nowMs).map((m) => m.id);
  const mvpIds = [...new Set(matches.map((m) => m.mvp_player_id).filter((id): id is string => Boolean(id)))];

  const [members, myRatings, myMvp, mvps, progress] = await Promise.all([
    supabase.from("team_members").select("match_id, player_id").in("match_id", ids),
    myPlayerId
      ? supabase.from("match_ratings").select("match_id").in("match_id", ids).eq("rater_player_id", myPlayerId)
      : Promise.resolve({ data: [] as Array<{ match_id: string }>, error: null }),
    myPlayerId
      ? supabase.from("match_mvp_votes").select("match_id").in("match_id", ids).eq("voter_player_id", myPlayerId)
      : Promise.resolve({ data: [] as Array<{ match_id: string }>, error: null }),
    mvpIds.length > 0
      ? supabase.from("players").select("id, nickname").in("id", mvpIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nickname: string }>, error: null }),
    Promise.all(openIds.map(async (id) => [id, await getVotingProgress(id)] as const)),
  ]);
  for (const result of [members, myRatings, myMvp, mvps]) if (result.error) throw result.error;

  const playersByMatch = new Map<string, string[]>();
  for (const m of members.data ?? []) playersByMatch.set(m.match_id, [...(playersByMatch.get(m.match_id) ?? []), m.player_id]);
  const ratedByMatch = new Map<string, number>();
  for (const r of myRatings.data ?? []) ratedByMatch.set(r.match_id, (ratedByMatch.get(r.match_id) ?? 0) + 1);
  const mvpVoted = new Set((myMvp.data ?? []).map((v) => v.match_id));
  const mvpNames = new Map((mvps.data ?? []).map((p) => [p.id, p.nickname]));
  const progressById = new Map(progress);

  return matches.flatMap((m) => {
    if (!m.voting_closes_at) return [];
    const teams: GroupVoting["teams"] = { a: { name: "Azul", score: null }, b: { name: "Rojo", score: null } };
    for (const t of m.teams) teams[t.side] = { name: t.name, score: t.score };
    const roster = playersByMatch.get(m.id) ?? [];
    const played = myPlayerId !== null && roster.includes(myPlayerId);
    const open = Date.parse(m.voting_closes_at) > nowMs;
    const total = played ? roster.length - 1 : 0;
    const rated = ratedByMatch.get(m.id) ?? 0;
    const p = progressById.get(m.id);
    return [
      {
        matchId: m.id,
        scheduledAt: m.scheduled_at,
        closesAt: m.voting_closes_at,
        teams,
        state: myVotingState({ phase: open ? "open" : "closed", played, total, rated, mvpVoted: mvpVoted.has(m.id) }),
        rated,
        total,
        progress: open && p ? { voters: p.voters, eligible: p.eligibleVoters } : null,
        mvpNickname: !open && m.mvp_player_id ? (mvpNames.get(m.mvp_player_id) ?? null) : null,
      },
    ];
  });
}
