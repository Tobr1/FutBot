"use client";

import { MoreVertical, ShieldOff, UserMinus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveMenu } from "@/components/ui/responsive-menu";
import { changeMemberRoleAction, removeMemberAction } from "../actions";

/**
 * Acciones de admin sobre un miembro: menú (hoja inferior en el teléfono) con
 * "Quitar del grupo" (con confirmación). El rol admin está reservado al
 * administrador de la app: solo se ofrece quitárselo a un admin heredado.
 */
export function MemberActions({
  groupId,
  member,
}: {
  groupId: string;
  member: { profileId: string; displayName: string; role: "admin" | "player" };
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = { groupId, profileId: member.profileId };
  const isAdmin = member.role === "admin";

  function changeRole() {
    startTransition(async () => {
      const result = await changeMemberRoleAction({ ...ref, role: "player" });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <>
      <ResponsiveMenu
        title={member.displayName}
        trigger={
          <Button variant="ghost" size="icon" disabled={isPending} aria-label={`Acciones para ${member.displayName}`}>
            <MoreVertical />
          </Button>
        }
        sections={[
          ...(isAdmin
            ? [{ items: [{ key: "role", label: "Quitar administrador", icon: ShieldOff, onSelect: changeRole }] }]
            : []),
          {
            items: [
              {
                key: "remove",
                label: "Quitar del grupo",
                icon: UserMinus,
                destructive: true,
                onSelect: () => setConfirmRemove(true),
              },
            ],
          },
        ]}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`¿Quitar a ${member.displayName}?`}
        description="Deja de ver el grupo. Su ficha y estadísticas se conservan sin vincular; puede volver con una nueva invitación."
        confirmLabel="Quitar"
        onConfirm={() => removeMemberAction(ref)}
      />
    </>
  );
}
