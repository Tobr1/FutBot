"use client";

import { useActionState, useRef } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { updateProfileAction } from "../actions";

export function ProfileForm({ displayName }: { displayName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(updateProfileAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="displayName" label="Nombre" hint="Lo ven los miembros de tus grupos." errors={errors?.displayName}>
        <Input
          {...fieldAria("displayName", errors?.displayName, true)}
          defaultValue={values?.displayName ?? displayName}
          maxLength={40}
          required
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="done"
        />
      </FormField>
      <div>
        <SubmitButton pendingText="Guardando…" className="w-full sm:w-auto">
          Guardar cambios
        </SubmitButton>
      </div>
    </form>
  );
}
