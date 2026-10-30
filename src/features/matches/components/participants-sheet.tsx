"use client";

import { Loader2, UserRoundPen } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BottomSheet, BottomSheetContent, BottomSheetTrigger } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { GuestEntry, Selection } from "@/domain/matches/participants";
import { squadSize } from "@/domain/matches/status";
import { setParticipantsAction } from "../actions";
import { RosterPicker, type RosterOption, SelectionSummary } from "./roster-picker";

/**
 * Editar la convocatoria desde el detalle del partido (admin). Quien deja
 * de estar como titular sale de los equipos (lo hace la base). Los invitados
 * nuevos se crean al guardar.
 */
export function ParticipantsSheet({
  groupId,
  matchId,
  playersPerTeam,
  roster,
  initial,
}: {
  groupId: string;
  matchId: string;
  playersPerTeam: number;
  roster: RosterOption[];
  initial: Selection[];
}) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(initial);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const capacity = squadSize(playersPerTeam);

  function save() {
    startTransition(async () => {
      const result = await setParticipantsAction({ groupId, matchId, participants: selection, guests });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        // Al abrir arranca de lo guardado (descarta cambios sin guardar).
        if (next) {
          setSelection(initial);
          setGuests([]);
        }
        setOpen(next);
      }}
    >
      <BottomSheetTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <UserRoundPen aria-hidden="true" />
          Editar
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent
        title="Convocatoria"
        header={<SelectionSummary selection={selection} capacity={capacity} guests={guests} />}
        footer={
          <Button type="button" size="lg" className="h-12 w-full" onClick={save} disabled={isPending} aria-busy={isPending || undefined}>
            {isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
            Guardar convocatoria
          </Button>
        }
        showCancel
      >
        <div className="pb-2">
          <RosterPicker
            players={roster}
            selection={selection}
            onChange={setSelection}
            capacity={capacity}
            guests={guests}
            onGuestsChange={setGuests}
          />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
