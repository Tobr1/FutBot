"use client";

import { Loader2, UserRoundPen } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SegmentedContent, SegmentedList, SegmentedTabs, SegmentedTrigger } from "@/components/shared/segmented-tabs";
import { BottomSheet, BottomSheetContent, BottomSheetTrigger } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { GuestEntry, Selection } from "@/domain/matches/participants";
import { squadSize } from "@/domain/matches/status";
import { setParticipantsAction } from "../actions";
import { NewPlayerRows, useImportedPlayers } from "./imported-players";
import { type ImportRosterPlayer, LineupImport } from "./lineup-import";
import { RosterPicker, type RosterOption, SelectionSummary } from "./roster-picker";

const listFormat = new Intl.ListFormat("es-AR", { type: "conjunction" });

/**
 * Editar la convocatoria desde el detalle del partido (admin): eligiendo del
 * plantel o pegando la lista de WhatsApp, que reemplaza a la convocatoria y
 * se revisa antes de guardar. Quien deja de estar como titular sale de los
 * equipos (lo hace la base). Las fichas nuevas de la lista, sus alias y los
 * invitados nuevos se crean al guardar.
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
  roster: Array<RosterOption & ImportRosterPlayer>;
  initial: Selection[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"plantel" | "whatsapp">("plantel");
  const [selection, setSelection] = useState(initial);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const imported = useImportedPlayers(groupId);
  const { newPlayers, aliases } = imported;
  const [isPending, startTransition] = useTransition();
  const capacity = squadSize(playersPerTeam);

  function save() {
    startTransition(async () => {
      const saved = await imported.save({ selection, newPlayers, aliases });
      if (!saved.ok) {
        toast.error(saved.message);
        return;
      }
      const result = await setParticipantsAction({ groupId, matchId, participants: saved.participants, guests });
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
          imported.reset();
          setMode("plantel");
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
        // Las fichas nuevas de la lista ocupan lugar igual que los invitados.
        header={<SelectionSummary selection={selection} capacity={capacity} guests={[...guests, ...newPlayers]} />}
        footer={
          <Button type="button" size="lg" className="h-12 w-full" onClick={save} disabled={isPending} aria-busy={isPending || undefined}>
            {isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
            Guardar convocatoria
          </Button>
        }
        showCancel
      >
        <SegmentedTabs value={mode} onValueChange={(value) => setMode(value as "plantel" | "whatsapp")} className="pb-2">
          <SegmentedList label="Cómo convocar">
            <SegmentedTrigger value="plantel">Elegir del plantel</SegmentedTrigger>
            <SegmentedTrigger value="whatsapp">Pegar lista</SegmentedTrigger>
          </SegmentedList>

          {/* forceMount: cambiar de pestaña no pierde lo pegado ni lo revisado. */}
          <SegmentedContent value="plantel" forceMount className="data-[state=inactive]:hidden">
            <RosterPicker
              players={roster}
              selection={selection}
              onChange={setSelection}
              capacity={Math.max(0, capacity - newPlayers.filter((p) => p.status === "confirmed").length)}
              guests={guests}
              onGuestsChange={setGuests}
              before={<NewPlayerRows players={newPlayers} onRemove={imported.remove} />}
            />
          </SegmentedContent>

          <SegmentedContent value="whatsapp" forceMount className="data-[state=inactive]:hidden">
            <LineupImport
              roster={roster}
              onApply={(result) => {
                const listed = new Set(result.entries.flatMap((e) => (e.kind === "player" ? [e.playerId] : [])));
                const leaving = selection
                  .filter((s) => !listed.has(s.playerId))
                  .map((s) => roster.find((p) => p.id === s.playerId)?.nickname ?? "Alguien");
                setSelection(
                  result.entries.flatMap((e) => (e.kind === "player" ? [{ playerId: e.playerId, status: e.status }] : [])),
                );
                imported.apply(result);
                setMode("plantel");
                const out =
                  leaving.length === 0
                    ? ""
                    : `${leaving.length === 1 ? "Sale" : "Salen"} ${listFormat.format(leaving)}: no ${leaving.length === 1 ? "está" : "están"} en la lista. `;
                toast.success(`Lista aplicada: ${result.entries.length} convocados.`, {
                  description: `${out}Guardá para confirmar.`,
                });
              }}
            />
          </SegmentedContent>
        </SegmentedTabs>
      </BottomSheetContent>
    </BottomSheet>
  );
}
