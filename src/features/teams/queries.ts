import "server-only";
import { cache } from "react";
import type { Side } from "@/domain/balancer";
import { choosePreviousTeams, type TeamRule, teamForecast } from "@/domain/matches/team-generator";
import type { WinProbability } from "@/domain/rating";
import { getGroupRatings, loadGroupHistory } from "@/features/stats/queries";
import { createClient } from "@/lib/supabase/server";

/*
 * DAL del armado inteligente: reglas persistentes del grupo, equipos del
 * partido anterior (variedad) y pronóstico con la valoración del motor.
 */

/** Reglas "juntos / separados" del grupo (RLS: cualquier miembro las lee). */
export const listTeamRules = cache(async (groupId: string): Promise<TeamRule[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_constraints")
    .select("id, player_a, player_b, kind, note")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({ id: r.id, playerA: r.player_a, playerB: r.player_b, kind: r.kind, note: r.note }));
});

/**
 * Equipos del último partido jugado antes de `before` (sin contar `matchId`).
 * Sale de los hechos que ya carga el motor, así que no agrega consultas.
 */
export async function getPreviousTeams(
  groupId: string,
  matchId: string,
  before: string,
): Promise<{ matchId: string; a: string[]; b: string[] } | undefined> {
  const history = await loadGroupHistory(groupId);
  return choosePreviousTeams(history.lines, { excludeMatchId: matchId, before });
}

/** Jugadores de cada equipo de un partido. */
export async function getMatchSides(matchId: string): Promise<Record<Side, string[]>> {
  const supabase = await createClient();
  const [teams, members] = await Promise.all([
    supabase.from("teams").select("id, side").eq("match_id", matchId),
    supabase.from("team_members").select("player_id, team_id").eq("match_id", matchId),
  ]);
  if (teams.error) throw teams.error;
  if (members.error) throw members.error;
  const sideOf = new Map(teams.data.map((t) => [t.id, t.side]));
  const sides: Record<Side, string[]> = { a: [], b: [] };
  for (const m of members.data) {
    const side = sideOf.get(m.team_id);
    if (side) sides[side].push(m.player_id);
  }
  return sides;
}

/**
 * Pronóstico (gana A / empate / gana B) con la habilidad del motor y el nivel
 * inicial como respaldo. null si algún equipo está vacío.
 */
export async function getForecast(groupId: string, teams: Record<Side, readonly string[]>): Promise<WinProbability | null> {
  if (!teams.a.length || !teams.b.length) return null;
  const [history, ratings] = await Promise.all([loadGroupHistory(groupId), getGroupRatings(groupId)]);
  const base = new Map(history.roster.map((p) => [p.id, p.baseRating]));
  return teamForecast(teams, (id) => {
    const skill = ratings.byPlayer[id]?.skill;
    return Number.isFinite(skill) ? skill : base.get(id);
  });
}
