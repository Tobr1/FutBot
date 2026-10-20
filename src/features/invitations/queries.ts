import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { TOKEN_PATTERN } from "./schemas";
import { type InvitationStatus, invitationStatus } from "./status";

export interface InvitationRow {
  id: string;
  token: string;
  role: "admin" | "player";
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  createdAt: string;
  status: InvitationStatus;
  playerNickname: string | null;
}

/** Invitaciones del grupo (RLS: solo admins las ven). */
export async function listInvitations(groupId: string, now: Date): Promise<InvitationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, token, role, max_uses, use_count, expires_at, revoked_at, created_at, players!invitations_player_fkey(nickname)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return data.map((inv) => ({
    id: inv.id,
    token: inv.token,
    role: inv.role,
    maxUses: inv.max_uses,
    useCount: inv.use_count,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
    status: invitationStatus(inv, now),
    playerNickname: inv.players?.nickname ?? null,
  }));
}

export interface InvitationPreview {
  groupName: string;
  groupSlug: string;
  role: "admin" | "player";
  playerNickname: string | null;
  inviterName: string | null;
  status: InvitationStatus;
  isMember: boolean;
}

/** Vista previa pública por token (funciona con o sin sesión). */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  if (!TOKEN_PATTERN.test(token) || !isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation_preview", { p_token: token });
  if (error) throw error;
  const row = data?.[0];
  if (!row?.group_name || !row.group_slug || !row.role) return null;
  return {
    groupName: row.group_name,
    groupSlug: row.group_slug,
    role: row.role,
    playerNickname: row.player_nickname,
    inviterName: row.inviter_name,
    status: (row.status ?? "revoked") as InvitationStatus,
    isMember: Boolean(row.is_member),
  };
}

/**
 * El "link del grupo": la invitación general de jugador más reciente que
 * sigue activa (la misma que muestra Ajustes → Invitaciones), o null.
 */
export async function getGroupInvitationToken(groupId: string, now: Date): Promise<string | null> {
  const invitations = await listInvitations(groupId, now);
  return invitations.find((inv) => inv.status === "valid" && inv.role === "player" && !inv.playerNickname)?.token ?? null;
}
