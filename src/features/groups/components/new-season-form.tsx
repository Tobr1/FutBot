"use client";

import { useActionState, useRef } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { startNewSeasonAction } from "../actions";

export function NewSeasonForm({ groupId, defaultStart }: { groupId: string; defaultStart: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(startNewSeasonAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="name" label="Nombre" errors={errors?.name}>
          <Input
            {...fieldAria("name", errors?.name)}
            placeholder="Ej.: Apertura 2027"
            defaultValue={values?.name}
            maxLength={40}
            autoCapitalize="sentences"
            autoComplete="off"
            enterKeyHint="next"
            required
          />
        </FormField>
        <FormField id="startsOn" label="Empieza el" hint="La temporada actual cierra el día anterior." errors={errors?.startsOn}>
          <Input {...fieldAria("startsOn", errors?.startsOn, true)} type="date" defaultValue={values?.startsOn ?? defaultStart} required />
        </FormField>
      </div>
      <div>
        <SubmitButton size="lg" pendingText="Creando…" className="w-full sm:w-auto">
          Empezar temporada
        </SubmitButton>
      </div>
    </form>
  );
}
