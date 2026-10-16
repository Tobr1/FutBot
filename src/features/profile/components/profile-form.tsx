"use client";

import { useActionState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-result";
import { updateProfileAction } from "../actions";

export function ProfileForm({ displayName, email }: { displayName: string; email: string | null }) {
  const [state, action] = useActionState(updateProfileAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="displayName" label="Nombre" hint="Lo ven los miembros de tus grupos." errors={errors?.displayName}>
        <Input {...fieldAria("displayName", errors?.displayName, true)} defaultValue={values?.displayName ?? displayName} maxLength={40} required />
      </FormField>
      <FormField id="email" label="Email">
        <Input id="email" value={email ?? ""} disabled readOnly />
      </FormField>
      <div>
        <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
