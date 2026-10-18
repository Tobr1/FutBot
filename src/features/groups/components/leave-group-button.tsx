"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListRow } from "@/components/shared/list-group";
import { Button } from "@/components/ui/button";
import { leaveGroupAction } from "../actions";

const CONFIRM = {
  description: "Dejás de ver el grupo. Tu ficha y tus estadísticas quedan en el plantel (sin vincular) por si volvés.",
  confirmLabel: "Salir",
} as const;

/**
 * Salir del grupo con confirmación.
 * - `button` (por defecto): botón destructivo suelto.
 * - `row`: fila de lista (va dentro de un <ListGroup>), para el hub "Más".
 */
export function LeaveGroupButton({
  groupId,
  groupName,
  variant = "button",
}: {
  groupId: string;
  groupName: string;
  variant?: "button" | "row";
}) {
  const [open, setOpen] = useState(false);
  const title = `¿Salir de ${groupName}?`;
  const onConfirm = () => leaveGroupAction(groupId);

  if (variant === "row") {
    return (
      <>
        <ListRow
          asChild
          destructive
          leading={<LogOut className="size-5 text-destructive" aria-hidden="true" />}
          title="Salir del grupo"
          subtitle="Tu ficha queda en el plantel"
        >
          <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} />
        </ListRow>
        <ConfirmDialog open={open} onOpenChange={setOpen} title={title} {...CONFIRM} onConfirm={onConfirm} />
      </>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <LogOut aria-hidden="true" />
          Salir del grupo
        </Button>
      }
      title={title}
      {...CONFIRM}
      onConfirm={onConfirm}
    />
  );
}
