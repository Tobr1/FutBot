"use client";

import { useActionState, useRef } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { resetPasswordAction } from "../actions";

/**
 * Nueva contraseña. Con `email`, agrega un campo de usuario oculto para que el
 * gestor de contraseñas guarde la clave nueva asociada a la cuenta correcta.
 */
export function ResetPasswordForm({ email }: { email?: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(resetPasswordAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  useFormErrorFocus(formRef, state);

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      {email && <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />}
      <FormMessage state={state} />
      <FormField id="password" label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números." errors={errors?.password}>
        <PasswordInput
          {...fieldAria("password", errors?.password, true)}
          autoComplete="new-password"
          enterKeyHint="next"
          required
        />
      </FormField>
      <FormField id="confirmPassword" label="Repetila" errors={errors?.confirmPassword}>
        <PasswordInput
          {...fieldAria("confirmPassword", errors?.confirmPassword)}
          autoComplete="new-password"
          enterKeyHint="done"
          required
        />
      </FormField>
      <SubmitButton size="lg" className="w-full" pendingText="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
