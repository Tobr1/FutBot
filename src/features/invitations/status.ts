export type InvitationStatus = "valid" | "expired" | "revoked" | "exhausted";

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  valid: "Activa",
  expired: "Vencida",
  revoked: "Revocada",
  exhausted: "Agotada",
};

/** Misma regla que get_invitation_preview() en la base. */
export function invitationStatus(
  inv: { revoked_at: string | null; expires_at: string | null; max_uses: number | null; use_count: number },
  now: Date,
): InvitationStatus {
  if (inv.revoked_at) return "revoked";
  if (inv.expires_at && new Date(inv.expires_at) <= now) return "expired";
  if (inv.max_uses !== null && inv.use_count >= inv.max_uses) return "exhausted";
  return "valid";
}
