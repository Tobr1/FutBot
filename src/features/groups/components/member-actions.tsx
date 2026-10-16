"use client";

import { MoreVertical, Shield, ShieldOff, UserMinus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { changeMemberRoleAction, removeMemberAction } from "../actions";

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

  function changeRole() {
    startTransition(async () => {
      const result = await changeMemberRoleAction({ ...ref, role: member.role === "admin" ? "player" : "admin" });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction(ref);
      if (result.ok) {
        toast.success(result.message);
        setConfirmRemove(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending} aria-label={`Acciones para ${member.displayName}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={changeRole}>
            {member.role === "admin" ? <ShieldOff aria-hidden="true" /> : <Shield aria-hidden="true" />}
            {member.role === "admin" ? "Quitar administrador" : "Hacer administrador"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(true)}>
            <UserMinus aria-hidden="true" />
            Quitar del grupo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmRemove} onOpenChange={(open) => !isPending && setConfirmRemove(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar a {member.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deja de ver el grupo. Su ficha y estadísticas se conservan sin vincular; puede volver con una nueva invitación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              Quitar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
