import "server-only";
import { cache } from "react";
import type { MatchStatus, ParticipantStatus } from "@/domain/matches/status";
import type { Side, StoredEvent } from "@/domain/matches/result";
import { type PlayerPositions, type Position, toPlayerPositions } from "@/domain/players/positions";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TeamScore {
  name: string;
  score: number | null;
}

export interface MatchListItem {
  id: string;
  scheduledAt: string;
  venue: string | null;
  playersPerTeam: number;
  status: MatchStatus;
  confirmed: number;
  reserve: number;
  teams: Record<Side, TeamScore>;
  mvp: { id: string; nickname: string } | null;
}

type MatchRow = {
  id: string;
  scheduled_at: string;
  venue: string | null;
  players_per_team: number;
  status: MatchStatus;
  mvp_player_id: string | null;
};

const LIST_COLUMNS = "id, scheduled_at, venue, players_per_team, status, mvp_player_id" as const;

/** Completa filas de matches con conteo de convocados, equipos y MVP. */
async function hydrateList(rows: MatchRow[]): Promise<MatchListItem[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const ids = rows.map((m) => m.id);
  const mvpIds = [...new Set(rows.map((m) => m.mvp_player_id).filter((id): id is string => Boolean(id)))];

  const [participants, teams, mvps] = await Promise.all([
    supabase.from("match_participants").select("match_id, status").in("match_id", ids),
    supabase.from("teams").select("match_id, side, name, score").in("match_id", ids),
    mvpIds.length > 0
      ? supabase.from("players").select("id, nickname").in("id", mvpIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nickname: string }>, error: null }),
  ]);
  if (participants.error) throw participants.error;
  if (teams.error) throw teams.error;
  if (mvps.error) throw mvps.error;

  const counts = new Map<string, { confirmed: number; reserve: number }>();
  for (const p of participants.data) {
    const entry = counts.get(p.match_id) ?? { confirmed: 0, reserve: 0 };
    if (p.status === "confirmed") entry.confirmed += 1;
    else if (p.status === "reserve") entry.reserve += 1;
    counts.set(p.match_id, entry);
  }
  const teamMap = new Map<string, Record<Side, TeamScore>>();
  for (const t of teams.data) {
    const entry = teamMap.get(t.match_id) ?? { a: { name: "Azul", score: null }, b: { name: "Rojo", score: null } };
    entry[t.side] = { name: t.name, score: t.score };
    teamMap.set(t.match_id, entry);
  }
  const mvpNames = new Map(mvps.data.map((p) => [p.id, p.nickname]));

  return rows.map((m) => ({
    id: m.id,
    scheduledAt: m.scheduled_at,
    venue: m.venue,
    playersPerTeam: m.players_per_team,
    status: m.status,
    confirmed: counts.get(m.id)?.confirmed ?? 0,
    reserve: counts.get(m.id)?.reserve ?? 0,
    teams: teamMap.get(m.id) ?? { a: { name: "Azul", score: null }, b: { name: "Rojo", score: null } },
    mvp: m.mvp_player_id ? { id: m.mvp_player_id, nickname: mvpNames.get(m.mvp_player_id) ?? "—" } : null,
  }));
}

export interface MatchLists {
  /** Programados y en curso, del más cercano al más lejano. */
  upcoming: MatchListItem[];
  /** Jugados y cancelados, del más reciente al más viejo. */
  past: MatchListItem[];
}

/** Partidos del grupo separados en próximos y jugados. */
export async function listMatches(groupId: string): Promise<MatchLists> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(LIST_COLUMNS)
    .eq("group_id", groupId)
    .order("scheduled_at", { ascending: false })
    .limit(120);
  if (error) throw error;

  const items = await hydrateList(data);
  const upcoming = items
    .filter((m) => m.status === "scheduled" || m.status === "in_progress")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const past = items.filter((m) => m.status === "finished" || m.status === "cancelled");
  return { upcoming, past };
}

export interface MatchesOverview {
  /** El próximo partido o, si no hay, el último jugado. */
  featured: { kind: "next" | "last"; match: MatchListItem } | null;
  /** Cantidad de partidos del grupo (cualquier estado). */
  total: number;
}

/** Para el inicio del grupo: próximo partido (o último resultado) y total. */
export async function getNextMatch(groupId: string): Promise<MatchesOverview> {
  const supabase = await createClient();
  const [next, last, total] = await Promise.all([
    supabase
      .from("matches")
      .select(LIST_COLUMNS)
      .eq("group_id", groupId)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: true })
      .limit(1),
    supabase
      .from("matches")
      .select(LIST_COLUMNS)
      .eq("group_id", groupId)
      .eq("status", "finished")
      .order("scheduled_at", { ascending: false })
      .limit(1),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("group_id", groupId),
  ]);
  if (next.error) throw next.error;
  if (last.error) throw last.error;

  const row = next.data[0] ?? last.data[0];
  const [match] = row ? await hydrateList([row]) : [];
  return {
    featured: match ? { kind: next.data[0] ? "next" : "last", match } : null,
    total: total.count ?? 0,
  };
}

export interface MatchPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  baseRating: number;
  positions: PlayerPositions;
  isActive: boolean;
}

export interface MatchParticipant extends MatchPlayer {
  status: ParticipantStatus | "dropped";
  sortOrder: number;
  /** Equipo en el que juega, si ya se armaron. */
  side: Side | null;
}

export interface MatchTeam {
  id: string;
  name: string;
  score: number | null;
  memberIds: string[];
}

export interface MatchEvent extends StoredEvent {
  id: string;
  minute: number | null;
}

export interface MatchDetail {
  id: string;
  groupId: string;
  scheduledAt: string;
  venue: string | null;
  playersPerTeam: number;
  status: MatchStatus;
  notes: string | null;
  finishedAt: string | null;
  votingClosesAt: string | null;
  mvp: { playerId: string; source: "votes" | "admin" } | null;
  participants: MatchParticipant[];
  teams: Record<Side, MatchTeam>;
  events: MatchEvent[];
  /** Los dos equipos tienen al menos un jugador. */
  teamsReady: boolean;
}

const PLAYER_COLUMNS = "id, nickname, avatar_url, base_rating, is_active, profile_id, player_positions(position, priority)" as const;

type PlayerRow = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  base_rating: number;
  is_active: boolean;
  profile_id: string | null;
  player_positions: Array<{ position: Position; priority: number }>;
};

/** Avatar efectivo: el de la ficha o, si está vinculada, el de la cuenta. */
async function toMatchPlayers(rows: PlayerRow[]): Promise<Map<string, MatchPlayer>> {
  const supabase = await createClient();
  const profileIds = rows.map((p) => p.profile_id).filter((id): id is string => Boolean(id));
  const avatars = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", profileIds);
    for (const p of data ?? []) avatars.set(p.id, p.avatar_url);
  }
  return new Map(
    rows.map((p) => [
      p.id,
      {
        id: p.id,
        nickname: p.nickname,
        avatarUrl: p.avatar_url ?? (p.profile_id ? (avatars.get(p.profile_id) ?? null) : null),
        baseRating: Number(p.base_rating),
        positions: toPlayerPositions(p.player_positions),
        isActive: p.is_active,
      },
    ]),
  );
}

/**
 * Partido completo: convocatoria con jugadores, equipos, eventos y MVP.
 * Memoizado por request (la página y generateMetadata comparten la consulta).
 */
export const getMatch = cache(async (groupId: string, matchId: string): Promise<MatchDetail | null> => {
  if (!UUID.test(matchId)) return null;
  const supabase = await createClient();

  const { data: match, error } = await supabase
    .from("matches")
    .select("id, group_id, scheduled_at, venue, players_per_team, status, notes, finished_at, voting_closes_at, mvp_player_id, mvp_source")
    .eq("group_id", groupId)
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!match) return null;

  const [participants, teams, members, events] = await Promise.all([
    supabase
      .from("match_participants")
      .select("player_id, status, sort_order")
      .eq("match_id", matchId)
      .order("sort_order"),
    supabase.from("teams").select("id, side, name, score").eq("match_id", matchId),
    supabase.from("team_members").select("player_id, team_id").eq("match_id", matchId),
    supabase.from("match_events").select("id, team_id, player_id, event_type, minute, created_at").eq("match_id", matchId).order("created_at"),
  ]);
  if (participants.error) throw participants.error;
  if (teams.error) throw teams.error;
  if (members.error) throw members.error;
  if (events.error) throw events.error;

  // El MVP siempre jugó (FK a team_members), así que está entre los convocados.
  const playerIds = participants.data.map((p) => p.player_id);
  let players = new Map<string, MatchPlayer>();
  if (playerIds.length > 0) {
    const { data, error: playersError } = await supabase.from("players").select(PLAYER_COLUMNS).in("id", playerIds);
    if (playersError) throw playersError;
    players = await toMatchPlayers(data as PlayerRow[]);
  }

  const sideByTeam = new Map<string, Side>();
  const teamRecord: Record<Side, MatchTeam> = {
    a: { id: "", name: "Azul", score: null, memberIds: [] },
    b: { id: "", name: "Rojo", score: null, memberIds: [] },
  };
  for (const t of teams.data) {
    sideByTeam.set(t.id, t.side);
    teamRecord[t.side] = { id: t.id, name: t.name, score: t.score, memberIds: [] };
  }
  const sideByPlayer = new Map<string, Side>();
  for (const m of members.data) {
    const side = sideByTeam.get(m.team_id);
    if (!side) continue;
    sideByPlayer.set(m.player_id, side);
    teamRecord[side].memberIds.push(m.player_id);
  }

  const participantList: MatchParticipant[] = participants.data.flatMap((p) => {
    const player = players.get(p.player_id);
    if (!player) return [];
    return [{ ...player, status: p.status, sortOrder: p.sort_order, side: sideByPlayer.get(p.player_id) ?? null }];
  });
  const byOrder = new Map(participantList.map((p, index) => [p.id, index]));
  for (const side of ["a", "b"] as const) {
    teamRecord[side].memberIds.sort((x, y) => (byOrder.get(x) ?? 0) - (byOrder.get(y) ?? 0));
  }

  return {
    id: match.id,
    groupId: match.group_id,
    scheduledAt: match.scheduled_at,
    venue: match.venue,
    playersPerTeam: match.players_per_team,
    status: match.status,
    notes: match.notes,
    finishedAt: match.finished_at,
    votingClosesAt: match.voting_closes_at,
    mvp:
      match.mvp_player_id && match.mvp_source
        ? { playerId: match.mvp_player_id, source: match.mvp_source === "votes" ? "votes" : "admin" }
        : null,
    participants: participantList,
    teams: teamRecord,
    events: events.data.flatMap((e) => {
      const side = sideByTeam.get(e.team_id);
      return side ? [{ id: e.id, type: e.event_type, playerId: e.player_id, side, minute: e.minute }] : [];
    }),
    teamsReady: teamRecord.a.memberIds.length > 0 && teamRecord.b.memberIds.length > 0,
  };
});

export interface RosterPlayer extends MatchPlayer {
  fullName: string | null;
  aliases: string[];
}

/** Plantel para convocar e importar listas (incluye alias guardados). */
export async function listRosterForMatches(groupId: string): Promise<RosterPlayer[]> {
  const supabase = await createClient();
  const [players, aliases] = await Promise.all([
    supabase.from("players").select(`${PLAYER_COLUMNS}, full_name`).eq("group_id", groupId).order("nickname"),
    supabase.from("player_aliases").select("player_id, alias").eq("group_id", groupId),
  ]);
  if (players.error) throw players.error;
  if (aliases.error) throw aliases.error;

  const rows = players.data as Array<PlayerRow & { full_name: string | null }>;
  const base = await toMatchPlayers(rows);
  const aliasMap = new Map<string, string[]>();
  for (const a of aliases.data) aliasMap.set(a.player_id, [...(aliasMap.get(a.player_id) ?? []), a.alias]);

  return rows.flatMap((p) => {
    const player = base.get(p.id);
    return player ? [{ ...player, fullName: p.full_name, aliases: aliasMap.get(p.id) ?? [] }] : [];
  });
}

export interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  actorName: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  /** Fecha (ISO) de cada partido referenciado que sigue existiendo. */
  matchDates: Record<string, string>;
  /** Nombres de cuentas mencionadas (actores y miembros). */
  profileNames: Record<string, string>;
}

const asObject = (value: Json | null): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** Últimos cambios del grupo (RLS: solo admins leen audit_logs). */
export async function listAuditLogs(groupId: string, limit = 100): Promise<AuditLogPage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_id, old_data, new_data, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const entries = data.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: null as string | null,
    oldData: asObject(row.old_data),
    newData: asObject(row.new_data),
    createdAt: row.created_at,
  }));

  const profileIds = new Set<string>();
  const matchIds = new Set<string>();
  for (const entry of entries) {
    if (entry.actorId) profileIds.add(entry.actorId);
    if (entry.entityType === "group_members") {
      const id = entry.newData?.profile_id ?? entry.oldData?.profile_id;
      if (typeof id === "string") profileIds.add(id);
    }
    if (entry.entityType === "matches" && entry.entityId && UUID.test(entry.entityId)) matchIds.add(entry.entityId);
  }

  const [profiles, matches] = await Promise.all([
    profileIds.size > 0
      ? supabase.from("profiles").select("id, display_name").in("id", [...profileIds])
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }>, error: null }),
    matchIds.size > 0
      ? supabase.from("matches").select("id, scheduled_at").eq("group_id", groupId).in("id", [...matchIds])
      : Promise.resolve({ data: [] as Array<{ id: string; scheduled_at: string }>, error: null }),
  ]);

  const profileNames: Record<string, string> = {};
  for (const p of profiles.data ?? []) profileNames[p.id] = p.display_name;
  const matchDates: Record<string, string> = {};
  for (const m of matches.data ?? []) matchDates[m.id] = m.scheduled_at;

  for (const entry of entries) entry.actorName = entry.actorId ? (profileNames[entry.actorId] ?? null) : null;
  return { entries, matchDates, profileNames };
}
