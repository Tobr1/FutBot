import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";
import { SLUG_PATTERN } from "./schemas";

export type GroupRole = Enums<"group_role">;

export interface GroupSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: GroupRole;
  memberCount: number;
  playerCount: number;
}

export interface GroupContext {
  group: Tables<"groups">;
  role: GroupRole;
  isAdmin: boolean;
  userId: string;
  myPlayer: { id: string; nickname: string } | null;
}

/** Grupos de la cuenta actual (RLS ya filtra los ajenos). */
export const getMyGroups = cache(async (): Promise<GroupSummary[]> => {
  const user = await requireUser();
  const supabase = await createClient();

  const [groupsResult, membershipsResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, slug, description, players!players_group_id_fkey(count), group_members!group_members_group_id_fkey(count)")
      .order("name"),
    supabase.from("group_members").select("group_id, role, joined_at").eq("profile_id", user.id),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const roles = new Map(membershipsResult.data.map((m) => [m.group_id, m]));
  return groupsResult.data
    .filter((g) => roles.has(g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      role: roles.get(g.id)!.role,
      memberCount: g.group_members[0]?.count ?? 0,
      playerCount: g.players[0]?.count ?? 0,
    }));
});

/**
 * Grupo por slug + rol de la cuenta actual. 404 si no existe o si no sos
 * miembro (RLS no lo devuelve): no se revela la existencia de grupos ajenos.
 */
export const getGroupContext = cache(async (slug: string): Promise<GroupContext> => {
  if (!SLUG_PATTERN.test(slug)) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: group, error } = await supabase.from("groups").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!group) notFound();

  const [membership, myPlayer] = await Promise.all([
    supabase.from("group_members").select("role").eq("group_id", group.id).eq("profile_id", user.id).maybeSingle(),
    supabase.from("players").select("id, nickname").eq("group_id", group.id).eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!membership.data) notFound();

  return {
    group,
    role: membership.data.role,
    isAdmin: membership.data.role === "admin",
    userId: user.id,
    myPlayer: myPlayer.data ?? null,
  };
});

export interface MemberRow {
  profileId: string;
  role: GroupRole;
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
  player: { id: string; nickname: string } | null;
}

export async function listMembers(groupId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select(
      "profile_id, role, joined_at, profiles!group_members_profile_id_fkey(display_name, avatar_url), players!players_member_fkey(id, nickname)",
    )
    .eq("group_id", groupId)
    .order("joined_at");
  if (error) throw error;

  return data.map((m) => {
    const player = Array.isArray(m.players) ? m.players[0] : m.players;
    return {
      profileId: m.profile_id,
      role: m.role,
      joinedAt: m.joined_at,
      displayName: m.profiles?.display_name ?? "Sin nombre",
      avatarUrl: m.profiles?.avatar_url ?? null,
      player: player ? { id: player.id, nickname: player.nickname } : null,
    };
  });
}

export async function listSeasons(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, starts_on, ends_on")
    .eq("group_id", groupId)
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return data;
}
