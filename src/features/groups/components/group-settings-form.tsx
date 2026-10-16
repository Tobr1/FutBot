"use client";

import { useActionState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/action-result";
import type { Tables } from "@/types/database";
import { updateGroupSettingsAction } from "../actions";
import { PlayersPerTeamPicker } from "./players-per-team-picker";

export function GroupSettingsForm({ group }: { group: Tables<"groups"> }) {
  const [state, action] = useActionState(updateGroupSettingsAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="groupId" value={group.id} />
      <FormMessage state={state} />

      <FormField id="name" label="Nombre" errors={errors?.name}>
        <Input {...fieldAria("name", errors?.name)} defaultValue={values?.name ?? group.name} maxLength={60} required />
      </FormField>

      <FormField id="description" label="Descripción" errors={errors?.description}>
        <Textarea {...fieldAria("description", errors?.description)} defaultValue={values?.description ?? group.description ?? ""} maxLength={280} rows={3} />
      </FormField>

      <FormField id="defaultPlayersPerTeam" label="Formato habitual" errors={errors?.defaultPlayersPerTeam}>
        <PlayersPerTeamPicker name="defaultPlayersPerTeam" defaultValue={Number(values?.defaultPlayersPerTeam ?? group.default_players_per_team)} />
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
            type="number"
            inputMode="numeric"
            min={1}
            max={336}
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
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            defaultValue={values?.rankingMinMatches ?? group.ranking_min_matches}
          />
        </FormField>
      </div>

      <div>
        <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
