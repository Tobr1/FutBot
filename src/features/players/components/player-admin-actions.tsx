"use client";

import { Link2, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createInvitationAction } from "@/features/invitations/actions";
import { ShareInvite } from "@/features/invitations/components/share-invite";
import { routes } from "@/lib/routes";
import { deletePlayerAction, setPlayerActiveAction } from "../actions";

export function PlayerAdminActions({
  slug,
  groupId,
  groupName,
  player,
}: {
  slug: string;
  groupId: string;
  groupName: string;
  player: { id: string; nickname: string; isActive: boolean; isLinked: boolean; matches: number };
}) {
  const ref = { groupId, playerId: player.id };
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createInvite() {
    startTransition(async () => {
      const result = await createInvitationAction({ groupId, playerId: player.id, expiresIn: "30" });
      if (result.ok && result.data) setInviteUrl(result.data.url);
      else if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" asChild>
        <Link href={routes.editPlayer(slug, player.id)}>
          <Pencil aria-hidden="true" />
          Editar
        </Link>
      </Button>

      {!player.isLinked && (
        <Button variant="secondary" onClick={createInvite} disabled={isPending}>
          <Link2 aria-hidden="true" />
          Invitar a vincular
        </Button>
      )}

      {player.isActive ? (
        <ConfirmDialog
          trigger={
            <Button variant="ghost">
              <PowerOff aria-hidden="true" />
              Desactivar
            </Button>
          }
          title={`¿Desactivar a ${player.nickname}?`}
          description="No va a aparecer al armar partidos ni en el plantel por defecto. Sus estadísticas se conservan y podés reactivarlo cuando quieras."
          confirmLabel="Desactivar"
          onConfirm={() => setPlayerActiveAction(ref, false)}
        />
      ) : (
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await setPlayerActiveAction(ref, true);
              if (result.ok) toast.success(result.message);
              else toast.error(result.message);
            })
          }
        >
          <Power aria-hidden="true" />
          Reactivar
        </Button>
      )}

      {player.matches === 0 ? (
        <ConfirmDialog
          trigger={
            <Button variant="destructive">
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          }
          title={`¿Eliminar a ${player.nickname}?`}
          description="Se borra la ficha definitivamente. Solo es posible porque todavía no jugó ningún partido."
          confirmLabel="Eliminar"
          onConfirm={() => deletePlayerAction(ref)}
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="destructive" disabled>
                <Trash2 aria-hidden="true" />
                Eliminar
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Tiene partidos jugados: desactivalo para conservar su historial.</TooltipContent>
        </Tooltip>
      )}

      <Dialog open={inviteUrl !== null} onOpenChange={(open) => !open && setInviteUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitación para {player.nickname}</DialogTitle>
            <DialogDescription>
              Mandale este link. Al aceptarlo, su cuenta queda vinculada a esta ficha. Sirve una sola vez y vence en 30 días.
            </DialogDescription>
          </DialogHeader>
          {inviteUrl && (
            <ShareInvite url={inviteUrl} message={`${player.nickname}, sumate a "${groupName}" en FUTBOLEROS para ver tus estadísticas:`} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
