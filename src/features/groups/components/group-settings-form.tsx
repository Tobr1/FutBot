"use client";

import { useActionState, useRef } from "react";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { fieldAria, FormField, groupAria } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import type { Tables } from "@/types/database";
import { updateGroupSettingsAction } from "../actions";
import { PlayersPerTeamPicker } from "./players-per-team-picker";

/** Campos numéricos: teclado numérico sin las flechitas de type="number" (zod coerciona en el servidor). */
const NUMERIC = { type: "text", inputMode: "numeric", pattern: "[0-9]*", enterKeyHint: "done" } as const;

export function GroupSettingsForm({ group }: { group: Tables<"groups"> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(updateGroupSettingsAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form ref={formRef} action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="groupId" value={group.id} />
      <FormMessage state={state} />

      <FormField id="name" label="Nombre" errors={errors?.name}>
        <Input
          {...fieldAria("name", errors?.name)}
          defaultValue={values?.name ?? group.name}
          maxLength={60}
          autoCapitalize="sentences"
          autoComplete="off"
          required
        />
      </FormField>

      <FormField id="description" label="Descripción" errors={errors?.description}>
        <Textarea
          {...fieldAria("description", errors?.description)}
          defaultValue={values?.description ?? group.description ?? ""}
          maxLength={280}
          rows={3}
          autoCapitalize="sentences"
        />
      </FormField>

      <FormField id="defaultPlayersPerTeam" label="Formato habitual" control="group" errors={errors?.defaultPlayersPerTeam}>
        <PlayersPerTeamPicker
          {...groupAria("defaultPlayersPerTeam", errors?.defaultPlayersPerTeam)}
          name="defaultPlayersPerTeam"
          defaultValue={Number(values?.defaultPlayersPerTeam ?? group.default_players_per_team)}
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="votingWindowHours"
          label="Duración de la votación (horas)"
          hint="Tiempo para votar después de cargar el resultado."
          errors={errors?.votingWindowHours}
        >
          <Input
            {...fieldAria("votingWindowHours", errors?.votingWindowHours, true)}
            {...NUMERIC}
            maxLength={3}
            defaultValue={values?.votingWindowHours ?? group.voting_window_hours}
          />
        </FormField>
        <FormField
          id="rankingMinMatches"
          label="Partidos mínimos para rankings"
          hint="Evita que alguien lidere con un solo partido."
          errors={errors?.rankingMinMatches}
        >
          <Input
            {...fieldAria("rankingMinMatches", errors?.rankingMinMatches, true)}
            {...NUMERIC}
            maxLength={2}
            defaultValue={values?.rankingMinMatches ?? group.ranking_min_matches}
          />
        </FormField>
      </div>

      <StickyActionBar>
        <SubmitButton size="lg" pendingText="Guardando…" className="w-full lg:w-auto">
          Guardar cambios
        </SubmitButton>
      </StickyActionBar>
    </form>
  );
}
