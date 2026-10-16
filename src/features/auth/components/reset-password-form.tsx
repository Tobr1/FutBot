"use client";

import { useActionState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { idleState } from "@/lib/action-result";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="password" label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números." errors={errors?.password}>
        <PasswordInput {...fieldAria("password", errors?.password, true)} autoComplete="new-password" required />
      </FormField>
      <FormField id="confirmPassword" label="Repetila" errors={errors?.confirmPassword}>
        <PasswordInput {...fieldAria("confirmPassword", errors?.confirmPassword)} autoComplete="new-password" required />
      </FormField>
      <SubmitButton size="lg" className="w-full" pendingText="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
