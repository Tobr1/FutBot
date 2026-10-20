"use client";

import { Ban, Copy, IdCard, MoreHorizontal, Share2, Shield, Users } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type MenuItemDef, ResponsiveMenu } from "@/components/ui/responsive-menu";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { revokeInvitationAction } from "../actions";
import type { InvitationRow } from "../queries";
import { INVITATION_STATUS_LABELS, type InvitationStatus } from "../status";

const STATUS_TONE = {
  valid: "success",
  expired: "neutral",
  revoked: "destructive",
  exhausted: "warning",
} as const satisfies Record<InvitationStatus, string>;

const noopSubscribe = () => () => {};

function invitationTitle(inv: InvitationRow) {
  if (inv.playerNickname) return `Para ${inv.playerNickname}`;
  return inv.role === "admin" ? "Administrador" : "Jugador";
}

function usageLabel(inv: InvitationRow) {
  const uses = `${inv.useCount}${inv.maxUses ? `/${inv.maxUses}` : ""} ${inv.useCount === 1 && !inv.maxUses ? "uso" : "usos"}`;
  return `${uses} · creada ${formatDate(inv.createdAt)}${inv.expiresAt ? ` · vence ${formatDate(inv.expiresAt)}` : ""}`;
}

export function InvitationList({
  invitations,
  origin,
  groupName,
}: {
  invitations: InvitationRow[];
  origin: string;
  /** Para el texto al compartir; opcional. */
  groupName?: string;
}) {
  const canShare = useSyncExternalStore(noopSubscribe, () => typeof navigator.share === "function", () => false);
  const [revoking, setRevoking] = useState<InvitationRow | null>(null);
  const message = groupName ? `Sumate a "${groupName}" en FulBot:` : "Sumate a mi grupo en FulBot:";

  const linkFor = (inv: InvitationRow) => `${origin}${routes.invitation(inv.token)}`;

  async function copy(inv: InvitationRow) {
    try {
      await navigator.clipboard.writeText(linkFor(inv));
      navigator.vibrate?.(10);
      toast.success("Link copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  async function share(inv: InvitationRow) {
    try {
      await navigator.share({ text: `${message}\n${linkFor(inv)}` });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copy(inv);
    }
  }

  return (
    <>
      <ListGroup>
        {invitations.map((inv) => {
          const title = invitationTitle(inv);
          const Icon = inv.playerNickname ? IdCard : inv.role === "admin" ? Shield : Users;
          const shareItems: MenuItemDef[] = [
            { key: "copy", label: "Copiar link", icon: Copy, onSelect: () => void copy(inv) },
            ...(canShare ? [{ key: "share", label: "Compartir", icon: Share2, onSelect: () => void share(inv) }] : []),
          ];

          return (
            <ListRow
              key={inv.id}
              leading={
                <span className="grid size-9 place-items-center rounded-lg bg-surface-3 text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              }
              title={title}
              subtitle={usageLabel(inv)}
              trailing={
                <>
                  <Badge size="sm" tone={STATUS_TONE[inv.status]}>
                    {INVITATION_STATUS_LABELS[inv.status]}
                  </Badge>
                  {inv.status === "valid" && (
                    <ResponsiveMenu
                      title={title}
                      description={usageLabel(inv)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Acciones para la invitación ${title} creada el ${formatDate(inv.createdAt)}`}
                          className="-mr-2"
                        >
                          <MoreHorizontal />
                        </Button>
                      }
                      sections={[
                        { items: shareItems },
                        {
                          items: [
                            { key: "revoke", label: "Revocar", icon: Ban, destructive: true, onSelect: () => setRevoking(inv) },
                          ],
                        },
                      ]}
                    />
                  )}
                </>
              }
            />
          );
        })}
      </ListGroup>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="¿Revocar invitación?"
        description="El link deja de funcionar inmediatamente. Quienes ya se unieron siguen en el grupo."
        confirmLabel="Revocar"
        onConfirm={() => revokeInvitationAction(revoking?.id ?? "")}
      />
    </>
  );
}
