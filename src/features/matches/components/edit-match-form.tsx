"use client";

import { useActionState, useRef, useState } from "react";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { updateMatchAction } from "../actions";
import { MatchFields } from "./match-fields";

export interface EditMatchDefaults {
  date: string;
  time: string;
  venue: string;
  playersPerTeam: number;
  notes: string;
}

/** Editar fecha, hora, cancha, formato y notas de un partido (admin). */
export function EditMatchForm({
  groupId,
  matchId,
  defaults,
  timeZoneLabel,
}: {
  groupId: string;
  matchId: string;
  defaults: EditMatchDefaults;
  timeZoneLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(updateMatchAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);

  return (
    <form ref={formRef} action={action} noValidate className="grid max-w-2xl gap-6">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="matchId" value={matchId} />
      <FormMessage state={state} />
      <MatchFields
        errors={errors}
        date={date}
        time={time}
        onDateChange={setDate}
        onTimeChange={setTime}
        defaultVenue={values?.venue ?? defaults.venue}
        defaultNotes={values?.notes ?? defaults.notes}
        defaultPlayersPerTeam={Number(values?.playersPerTeam ?? defaults.playersPerTeam)}
        timeZoneLabel={timeZoneLabel}
      />
      <StickyActionBar>
        <SubmitButton size="lg" pendingText="Guardando…" className="w-full lg:w-auto">
          Guardar cambios
        </SubmitButton>
      </StickyActionBar>
    </form>
  );
}
