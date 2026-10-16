"use client";

import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { leaveGroupAction } from "../actions";

export function LeaveGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <LogOut aria-hidden="true" />
          Salir del grupo
        </Button>
      }
      title={`¿Salir de ${groupName}?`}
      description="Dejás de ver el grupo. Tu ficha y tus estadísticas quedan en el plantel (sin vincular) por si volvés."
      confirmLabel="Salir"
      onConfirm={() => leaveGroupAction(groupId)}
    />
  );
}
