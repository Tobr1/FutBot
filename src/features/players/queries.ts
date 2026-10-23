import "server-only";
import { cache } from "react";
import { type DominantFoot, type PlayerPositions, toPlayerPositions } from "@/domain/players/positions";
import { buildCard, type CardModel } from "@/domain/cards/cards";
import { overall } from "@/domain/players/rating";
import { getGroupAttributes } from "@/features/cards/queries";
import { getDisplayRatings } from "@/features/stats/queries";
import { createClient } from "@/lib/supabase/server";

export interface PlayerStatsSummary {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  mvps: number;
}

export const EMPTY_STATS: PlayerStatsSummary = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, mvps: 0 };

export interface PlayerListItem {
  id: string;
  nickname: string;
  fullName: string | null;
  avatarUrl: string | null;
  /** Nivel inicial que fija un admin (editable). */
  baseRating: number;
  /** Valoración visible: la del motor o, sin datos, el nivel inicial. */
  rating: number;
  /** Pocos partidos: la valoración todavía es provisional. */
  isProvisional: boolean;
  isActive: boolean;
  isLinked: boolean;
  profileId: string | null;
  dominantFoot: DominantFoot | null;
  positions: PlayerPositions;
  stats: PlayerStatsSummary;
  /** Carta: media de los atributos (o, sin atributos, de los partidos), nivel y élite. */
  card: CardModel;
}

const PLAYER_COLUMNS =
  "id, nickname, full_name, avatar_url, base_rating, is_active, profile_id, dominant_foot, created_at, player_positions(position, priority)" as const;

/** Plantel del grupo con posiciones, avatar efectivo y totales. */
export async function listPlayers(groupId: string): Promise<PlayerListItem[]> {
  const supabase = await createClient();
  const [playersResult, statsResult, ratingOf, attributes] = await Promise.all([
    supabase.from("players").select(PLAYER_COLUMNS).eq("group_id", groupId).order("nickname"),
    supabase.rpc("get_player_stats", { p_group_id: groupId }),
    getDisplayRatings(groupId),
    getGroupAttributes(groupId),
  ]);
  if (playersResult.error) throw playersResult.error;
  if (statsResult.error) throw statsResult.error;

  const avatars = await linkedAvatars(playersResult.data.map((p) => p.profile_id));
  const stats = new Map(statsResult.data.map((s) => [s.player_id, s]));

  return playersResult.data.map((p) => withCard(attributes.get(p.id) ?? null, {
    id: p.id,
    nickname: p.nickname,
    fullName: p.full_name,
    avatarUrl: p.avatar_url ?? (p.profile_id ? (avatars.get(p.profile_id) ?? null) : null),
    baseRating: Number(p.base_rating),
    ...ratingOf(p.id, Number(p.base_rating)),
    isActive: p.is_active,
    isLinked: p.profile_id !== null,
    profileId: p.profile_id,
    dominantFoot: p.dominant_foot,
    positions: toPlayerPositions(p.player_positions),
    stats: toStats(stats.get(p.id)),
  }));
}

/** Suma la carta a una ficha ya armada (posición, MVP y valoración por partidos). */
function withCard<T extends Omit<PlayerListItem, "card">>(attributes: Parameters<typeof buildCard>[0]["attributes"], player: T): T & { card: CardModel } {
  return {
    ...player,
    card: buildCard({
      attributes,
      position: player.positions.primary,
      mvps: player.stats.mvps,
      formOverall: overall(player.rating),
    }),
  };
}

export interface PlayerDetail extends PlayerListItem {
  linkedName: string | null;
  createdAt: string;
}

/**
 * Ficha completa de un jugador. Memoizada por request (React cache): la
 * página y generateMetadata comparten una sola consulta.
 */
export const getPlayer = cache(async (groupId: string, playerId: string): Promise<PlayerDetail | null> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId)) return null;
  const supabase = await createClient();
  const [playerResult, statsResult, ratingOf, attributes] = await Promise.all([
    supabase.from("players").select(PLAYER_COLUMNS).eq("group_id", groupId).eq("id", playerId).maybeSingle(),
    supabase.rpc("get_player_stats", { p_group_id: groupId }),
    getDisplayRatings(groupId),
    getGroupAttributes(groupId),
  ]);
  if (playerResult.error) throw playerResult.error;
  const p = playerResult.data;
  if (!p) return null;

  let linkedName: string | null = null;
  let linkedAvatar: string | null = null;
  if (p.profile_id) {
    const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", p.profile_id).maybeSingle();
    linkedName = profile?.display_name ?? null;
    linkedAvatar = profile?.avatar_url ?? null;
  }

  return withCard(attributes.get(p.id) ?? null, {
    id: p.id,
    nickname: p.nickname,
    fullName: p.full_name,
    avatarUrl: p.avatar_url ?? linkedAvatar,
    baseRating: Number(p.base_rating),
    ...ratingOf(p.id, Number(p.base_rating)),
    isActive: p.is_active,
    isLinked: p.profile_id !== null,
    profileId: p.profile_id,
    dominantFoot: p.dominant_foot,
    positions: toPlayerPositions(p.player_positions),
    stats: toStats(statsResult.data?.find((s) => s.player_id === p.id)),
    linkedName,
    createdAt: p.created_at,
  });
});

/** Fichas sin cuenta, para que un miembro nuevo reclame la suya. */
export async function listUnclaimedPlayers(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, nickname, full_name, player_positions(position, priority)")
    .eq("group_id", groupId)
    .is("profile_id", null)
    .eq("is_active", true)
    .order("nickname");
  if (error) throw error;
  return data.map((p) => ({ id: p.id, nickname: p.nickname, fullName: p.full_name, positions: toPlayerPositions(p.player_positions) }));
}

async function linkedAvatars(profileIds: Array<string | null>): Promise<Map<string, string | null>> {
  const ids = profileIds.filter((id): id is string => Boolean(id));
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.avatar_url]));
}

function toStats(row: Partial<Record<keyof PlayerStatsSummary, number | null>> | undefined): PlayerStatsSummary {
  if (!row) return EMPTY_STATS;
  return {
    matches: row.matches ?? 0,
    wins: row.wins ?? 0,
    draws: row.draws ?? 0,
    losses: row.losses ?? 0,
    goals: row.goals ?? 0,
    assists: row.assists ?? 0,
    mvps: row.mvps ?? 0,
  };
}
