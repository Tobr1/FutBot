"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { FormMessage } from "@/components/shared/form-message";
import { SegmentedContent, SegmentedList, SegmentedTabs, SegmentedTrigger } from "@/components/shared/segmented-tabs";
import { SubmitButton } from "@/components/shared/submit-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { resolveDayHint } from "@/domain/matches/datetime";
import type { ConvocationEntry } from "@/domain/matches/import-review";
import { confirmedGuests, dedupeSelection, type GuestEntry, type Selection } from "@/domain/matches/participants";
import { squadSize } from "@/domain/matches/status";
import { normalizeName } from "@/domain/names/normalize";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { type ActionState, errorState, formValues, idleState } from "@/lib/action-result";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addPlayersFromImportAction, createMatchAction } from "../actions";
import { type ImportRosterPlayer, LineupImport } from "./lineup-import";
import { MatchFields } from "./match-fields";
import { RosterPicker, type RosterOption } from "./roster-picker";

type NewEntry = Extract<ConvocationEntry, { kind: "new" }>;

export type CreateMatchRosterPlayer = RosterOption & ImportRosterPlayer;

/**
 * Alta de partido: datos + convocatoria eligiendo del plantel o pegando la
 * lista de WhatsApp, más invitados que vienen a completar. Las fichas nuevas
 * y los alias se crean recién al confirmar ("Crear partido"), justo antes de
 * crear el partido; los invitados, junto con el partido.
 */
export function CreateMatchForm({
  groupId,
  timeZone,
  timeZoneLabel,
  defaultPlayersPerTeam,
  roster,
}: {
  groupId: string;
  timeZone: string;
  timeZoneLabel?: string;
  defaultPlayersPerTeam: number;
  roster: CreateMatchRosterPlayer[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<"plantel" | "whatsapp">("plantel");
  const [selection, setSelection] = useState<Selection[]>([]);
  const [newPlayers, setNewPlayers] = useState<NewEntry[]>([]);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [aliases, setAliases] = useState<Array<{ playerId: string; alias: string }>>([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(defaultPlayersPerTeam);

  // Fichas ya creadas en un intento anterior: no se crean dos veces.
  const created = useRef<Record<string, string>>({});
  const aliasesSaved = useRef(false);

  const [state, action] = useActionState(async (prev: ActionState, formData: FormData): Promise<ActionState> => {
    // La convocatoria viaja en un input oculto (estado al momento de enviar).
    const current = JSON.parse(String(formData.get("convocation") ?? "{}")) as {
      selection: Selection[];
      newPlayers: NewEntry[];
      aliases: Array<{ playerId: string; alias: string }>;
      guests: GuestEntry[];
    };
    formData.delete("convocation");
    let ids = created.current;
    const pending = current.newPlayers.filter((p) => !ids[normalizeName(p.nickname) ?? ""]);
    const aliasesToSave = aliasesSaved.current ? [] : current.aliases;

    if (pending.length > 0 || aliasesToSave.length > 0) {
      const result = await addPlayersFromImportAction({
        groupId,
        players: pending.map((p) => ({ nickname: p.nickname })),
        aliases: aliasesToSave,
      });
      if (!result.ok) return errorState(result.message, { values: formValues(formData) });
      ids = { ...ids, ...result.data?.ids };
      created.current = ids;
      aliasesSaved.current = true;
    }

    const participants = dedupeSelection([
      ...current.selection,
      ...current.newPlayers.flatMap((p) => {
        const playerId = ids[normalizeName(p.nickname) ?? ""];
        return playerId ? [{ playerId, status: p.status }] : [];
      }),
    ]);
    formData.set("participants", JSON.stringify(participants));
    formData.set("guests", JSON.stringify(current.guests));
    return createMatchAction(prev, formData);
  }, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  const capacity = squadSize(playersPerTeam);
  const confirmed =
    selection.filter((s) => s.status === "confirmed").length +
    newPlayers.filter((p) => p.status === "confirmed").length +
    confirmedGuests(guests);
  const reserve = selection.length + newPlayers.length + guests.length - confirmed;

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="grid max-w-2xl gap-8"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="convocation" value={JSON.stringify({ selection, newPlayers, aliases, guests })} />
      <FormMessage state={state} />

      <section aria-labelledby="datos-partido" className="grid gap-4">
        <h2 id="datos-partido" className="text-base font-semibold tracking-tight">
          Datos
        </h2>
        <MatchFields
          errors={errors}
          date={date}
          time={time}
          onDateChange={setDate}
          onTimeChange={setTime}
          defaultVenue={values?.venue ?? ""}
          defaultNotes={values?.notes ?? ""}
          defaultPlayersPerTeam={defaultPlayersPerTeam}
          onPlayersPerTeamChange={setPlayersPerTeam}
          timeZoneLabel={timeZoneLabel}
        />
      </section>

      <section aria-labelledby="convocatoria" className="grid gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="convocatoria" className="text-base font-semibold tracking-tight">
            Convocatoria
          </h2>
          <p className="text-sm text-muted-foreground tabular" aria-live="polite">
            <span className={cn("font-semibold", confirmed >= capacity ? "text-success" : "text-foreground")}>
              {confirmed}/{capacity}
            </span>{" "}
            titulares{reserve > 0 && ` · ${reserve} sup.`}
          </p>
        </div>

        <SegmentedTabs value={mode} onValueChange={(value) => setMode(value as "plantel" | "whatsapp")}>
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
              before={newPlayers.map((p) => (
                <li key={p.nickname} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <UserAvatar name={p.nickname} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{p.nickname}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <Badge tone="primary" size="sm">
                        Ficha nueva
                      </Badge>
                      <span className="text-xs text-muted-foreground">{p.status === "confirmed" ? "Titular" : "Suplente"}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewPlayers((list) => list.filter((x) => x.nickname !== p.nickname))}
                    aria-label={`No crear la ficha de ${p.nickname}`}
                    className="pressable grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            />
          </SegmentedContent>

          <SegmentedContent value="whatsapp" forceMount className="data-[state=inactive]:hidden">
            <LineupImport
              roster={roster}
              onApply={(result) => {
                setSelection(
                  result.entries.flatMap((e) => (e.kind === "player" ? [{ playerId: e.playerId, status: e.status }] : [])),
                );
                setNewPlayers(result.entries.filter((e): e is NewEntry => e.kind === "new"));
                setAliases(result.rememberAliases ? result.aliases : []);
                aliasesSaved.current = false;
                let filled = false;
                if (!date && result.header.dayHint) {
                  setDate(resolveDayHint(result.header.dayHint, todayIso(timeZone)));
                  filled = true;
                }
                if (!time && result.header.timeHint) {
                  setTime(result.header.timeHint);
                  filled = true;
                }
                setMode("plantel");
                toast.success(
                  `Lista aplicada: ${result.entries.length} convocados${filled ? ". Completamos la fecha desde la lista" : ""}.`,
                );
              }}
            />
          </SegmentedContent>
        </SegmentedTabs>
      </section>

      <StickyActionBar>
        <SubmitButton size="lg" pendingText="Creando…" className="w-full lg:w-auto">
          Crear partido
        </SubmitButton>
      </StickyActionBar>
    </form>
  );
}
