"use client";

import { Ban, CalendarClock, MoreHorizontal, Pencil, PlayCircle, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { type MenuItemDef, ResponsiveMenu } from "@/components/ui/responsive-menu";
import { allowedStatusChanges, canDeleteMatch, type ManualStatus, type MatchStatus } from "@/domain/matches/status";
import { deleteMatchAction, setMatchStatusAction } from "../actions";

/**
 * Menú ⋯ del partido para admins: editar datos, cambiar el estado,
 * cancelar y eliminar (con confirmación). En mobile es una hoja inferior.
 */
export function MatchAdminMenu({
  groupId,
  matchId,
  status,
  editHref,
  dayLabel,
}: {
  groupId: string;
  matchId: string;
  status: MatchStatus;
  editHref: string;
  /** "Sáb 24/10" para los textos de confirmación. */
  dayLabel: string;
}) {
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = { groupId, matchId };
  const transitions = allowedStatusChanges(status);

  function changeStatus(next: ManualStatus) {
    if (isPending) return;
    startTransition(async () => {
      const result = await setMatchStatusAction({ ...ref, status: next });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const statusItems: MenuItemDef[] = [];
  if (transitions.includes("in_progress")) {
    statusItems.push({ key: "in_progress", label: "Marcar en curso", icon: PlayCircle, onSelect: () => changeStatus("in_progress") });
  }
  if (transitions.includes("scheduled")) {
    statusItems.push(
      status === "cancelled"
        ? { key: "reactivate", label: "Reactivar partido", icon: RotateCcw, onSelect: () => changeStatus("scheduled") }
        : { key: "scheduled", label: "Volver a programado", icon: CalendarClock, onSelect: () => changeStatus("scheduled") },
    );
  }

  const deletable = canDeleteMatch(status);
  const dangerItems: MenuItemDef[] = [];
  if (transitions.includes("cancelled")) {
    dangerItems.push({ key: "cancel", label: "Cancelar partido", icon: Ban, destructive: true, onSelect: () => setConfirm("cancel") });
  }
  dangerItems.push({
    key: "delete",
    label: "Eliminar partido",
    icon: Trash2,
    destructive: true,
    disabled: !deletable,
    description: deletable ? undefined : "Ya se jugó: queda en el historial. Podés corregir el resultado.",
    onSelect: () => setConfirm("delete"),
  });

  return (
    <>
      <ResponsiveMenu
        title={`Partido del ${dayLabel}`}
        trigger={
          <Button type="button" variant="ghost" size="icon" aria-busy={isPending || undefined} aria-label="Más acciones del partido">
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        }
        sections={[
          {
            items: [
              { key: "edit", label: "Editar datos", icon: Pencil, href: editHref, transitionTypes: ["nav-forward"] },
              ...statusItems,
            ],
          },
          { items: dangerItems },
        ]}
      />

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Cancelar el partido?"
        description={`El partido del ${dayLabel} queda cancelado. La convocatoria se conserva y podés reactivarlo después.`}
        confirmLabel="Cancelar partido"
        onConfirm={() => setMatchStatusAction({ ...ref, status: "cancelled" })}
      />

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="¿Eliminar el partido?"
        description={`Se borra el partido del ${dayLabel} con su convocatoria y equipos. No se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteMatchAction(ref)}
      />
    </>
  );
}
