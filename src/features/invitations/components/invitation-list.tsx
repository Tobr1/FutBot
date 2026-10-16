"use client";

import { Ban, Copy, IdCard, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { revokeInvitationAction } from "../actions";
import type { InvitationRow } from "../queries";
import { INVITATION_STATUS_LABELS } from "../status";

const STATUS_STYLES = {
  valid: "bg-success/15 text-success",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-destructive/15 text-destructive",
  exhausted: "bg-warning/15 text-warning",
} as const;

export function InvitationList({ invitations, origin }: { invitations: InvitationRow[]; origin: string }) {
  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(`${origin}${routes.invitation(token)}`);
      toast.success("Link copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/70">
      {invitations.map((inv) => (
        <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            {inv.playerNickname ? <IdCard className="size-4" /> : inv.role === "admin" ? <Shield className="size-4" /> : <Users className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {inv.playerNickname ? `Para ${inv.playerNickname}` : inv.role === "admin" ? "Administrador" : "Jugador"}
            </p>
            <p className="text-xs text-muted-foreground">
              {inv.useCount}
              {inv.maxUses ? `/${inv.maxUses}` : ""} {inv.useCount === 1 ? "uso" : "usos"} · creada {formatDate(inv.createdAt)}
              {inv.expiresAt && ` · vence ${formatDate(inv.expiresAt)}`}
            </p>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[inv.status])}>
            {INVITATION_STATUS_LABELS[inv.status]}
          </span>
          {inv.status === "valid" && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => copy(inv.token)} aria-label="Copiar link">
                <Copy />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Revocar invitación">
                    <Ban />
                  </Button>
                }
                title="¿Revocar invitación?"
                description="El link deja de funcionar inmediatamente. Quienes ya se unieron siguen en el grupo."
                confirmLabel="Revocar"
                onConfirm={() => revokeInvitationAction(inv.id)}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
