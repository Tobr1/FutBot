import "server-only";
import { cache } from "react";
import { hasPendingVotes } from "@/domain/voting/voting";
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
