import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getSessionUser, requireUser } from "@/lib/auth/session";
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

/**
 * ¿La cuenta actual es la administradora de FulBot? Hay un único admin de la
 * app; el resto ve y vota. RLS solo deja leer la fila propia de app_admins.
 */
export const getIsAppAdmin = cache(async (): Promise<boolean> => {
  const user = await getSessionUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_admins").select("profile_id").eq("profile_id", user.id).maybeSingle();
  if (error) throw error;
  return data !== null;
});

/** Rol efectivo: "admin" en un grupo solo cuenta para el admin de la app (igual que is_group_admin). */
function effectiveRole(role: GroupRole, isAppAdmin: boolean): GroupRole {
  return role === "admin" && isAppAdmin ? "admin" : "player";
}

/** Grupos de la cuenta actual (RLS ya filtra los ajenos). */
export const getMyGroups = cache(async (): Promise<GroupSummary[]> => {
  const user = await requireUser();
  const supabase = await createClient();

  const [groupsResult, membershipsResult, isAppAdmin] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, slug, description, players!players_group_id_fkey(count), group_members!group_members_group_id_fkey(count)")
      .order("name"),
    supabase.from("group_members").select("group_id, role, joined_at").eq("profile_id", user.id),
    getIsAppAdmin(),
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
      role: effectiveRole(roles.get(g.id)!.role, isAppAdmin),
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

  // Una sola ida y vuelta: el grupo con mi membresía y mi ficha embebidas
  // (en paralelo con el chequeo de admin de la app).
  const [{ data, error }, isAppAdmin] = await Promise.all([
    supabase
      .from("groups")
      .select("*, group_members!group_members_group_id_fkey(role), players!players_group_id_fkey(id, nickname)")
      .eq("slug", slug)
      .eq("group_members.profile_id", user.id)
      .eq("players.profile_id", user.id)
      .maybeSingle(),
    getIsAppAdmin(),
  ]);
  if (error) throw error;
  if (!data) notFound();

  const { group_members: memberships, players: myPlayers, ...group } = data;
  const membership = memberships[0];
  if (!membership) notFound();
  const myPlayer = myPlayers[0];
  const role = effectiveRole(membership.role, isAppAdmin);

  return {
    group,
    role,
    isAdmin: role === "admin",
    userId: user.id,
    myPlayer: myPlayer ? { id: myPlayer.id, nickname: myPlayer.nickname } : null,
  };
});

/**
 * Como getGroupContext pero sin redirigir ni lanzar 404: null si no hay
 * sesión, si el grupo no existe o si no sos miembro. Para route handlers,
 * que responden con su propio status (no se revela si el grupo existe).
 */
export async function findGroupContext(slug: string): Promise<GroupContext | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: group, error } = await supabase.from("groups").select("*").eq("slug", slug).maybeSingle();
  if (error || !group) return null;
  const [membership, myPlayer, isAppAdmin] = await Promise.all([
    supabase.from("group_members").select("role").eq("group_id", group.id).eq("profile_id", user.id).maybeSingle(),
    supabase.from("players").select("id, nickname").eq("group_id", group.id).eq("profile_id", user.id).maybeSingle(),
    getIsAppAdmin(),
  ]);
  if (!membership.data) return null;
  const role = effectiveRole(membership.data.role, isAppAdmin);
  return {
    group,
    role,
    isAdmin: role === "admin",
    userId: user.id,
    myPlayer: myPlayer.data ?? null,
  };
}

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
