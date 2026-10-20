"use client";

import { Link2, MoreHorizontal, Power, PowerOff, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { type MenuItemDef, ResponsiveMenu } from "@/components/ui/responsive-menu";
import { createInvitationAction } from "@/features/invitations/actions";
import { ShareInvite } from "@/features/invitations/components/share-invite";
import { deletePlayerAction, setPlayerActiveAction } from "../actions";

/**
 * Menú ⋯ de la ficha para admins (en el StackHeader). En mobile es una hoja
 * inferior; en escritorio, un dropdown. Las acciones destructivas confirman
 * con un diálogo que se abre recién cuando el menú terminó de cerrarse.
 */
export function PlayerAdminMenu({
  groupId,
  groupName,
  player,
}: {
  /** Reservado (rutas del grupo); hoy las acciones solo necesitan el id. */
  slug: string;
  groupId: string;
  groupName: string;
  player: { id: string; nickname: string; isActive: boolean; isLinked: boolean; matches: number };
}) {
  const ref = { groupId, playerId: player.id };
  const [confirm, setConfirm] = useState<"deactivate" | "delete" | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function createInvite() {
    if (isPending) return;
    startTransition(async () => {
      const result = await createInvitationAction({ groupId, playerId: player.id, expiresIn: "30" });
      if (result.ok && result.data) setInviteUrl(result.data.url);
      else if (!result.ok) toast.error(result.message);
    });
  }

  function reactivate() {
    if (isPending) return;
    startTransition(async () => {
      const result = await setPlayerActiveAction(ref, true);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const canDelete = player.matches === 0;
  const fichaItems: MenuItemDef[] = [];
  if (!player.isLinked) {
    fichaItems.push({ key: "invite", label: "Invitar a vincular", icon: Link2, onSelect: createInvite });
  }
  fichaItems.push(
    player.isActive
      ? { key: "deactivate", label: "Desactivar", icon: PowerOff, onSelect: () => setConfirm("deactivate") }
      : { key: "reactivate", label: "Reactivar", icon: Power, onSelect: reactivate },
  );

  return (
    <>
      <ResponsiveMenu
        title={player.nickname}
        trigger={
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon"
            // Sin `disabled` mientras corre una acción: perdería el foco que le devolvió el menú.
            aria-busy={isPending || undefined}
            aria-label={`Más acciones para ${player.nickname}`}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        }
        sections={[
          { items: fichaItems },
          {
            items: [
              {
                key: "delete",
                label: "Eliminar ficha",
                icon: Trash2,
                destructive: true,
                disabled: !canDelete,
                description: canDelete ? undefined : "Tiene partidos jugados: desactivalo para conservar su historial.",
                onSelect: () => setConfirm("delete"),
              },
            ],
          },
        ]}
      />

      <ConfirmDialog
        open={confirm === "deactivate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`¿Desactivar a ${player.nickname}?`}
        description="No va a aparecer al armar partidos ni en el plantel por defecto. Sus estadísticas se conservan y podés reactivarlo cuando quieras."
        confirmLabel="Desactivar"
        onConfirm={() => setPlayerActiveAction(ref, false)}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`¿Eliminar a ${player.nickname}?`}
        description="Se borra la ficha definitivamente. Solo es posible porque todavía no jugó ningún partido."
        confirmLabel="Eliminar"
        onConfirm={() => deletePlayerAction(ref)}
      />

      <BottomSheet open={inviteUrl !== null} onOpenChange={(open) => !open && setInviteUrl(null)}>
        <BottomSheetContent
          title={`Invitación para ${player.nickname}`}
          description="Mandale este link. Al aceptarlo, su cuenta queda vinculada a esta ficha. Sirve una sola vez y vence en 30 días."
          showCancel="Cerrar"
          onCloseAutoFocus={(event) => {
            // La hoja no tiene disparador propio: el foco vuelve al botón ⋯.
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
        >
          {inviteUrl && (
            <div className="pb-2">
              <ShareInvite
                url={inviteUrl}
                message={`${player.nickname}, sumate a "${groupName}" en FulBot para ver tus estadísticas:`}
              />
            </div>
          )}
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
