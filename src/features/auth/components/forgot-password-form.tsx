"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { routes } from "@/lib/routes";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(forgotPasswordAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  useFormErrorFocus(formRef, state);

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="email" label="Email de tu cuenta" errors={errors?.email}>
        <Input
          {...fieldAria("email", errors?.email)}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="vos@ejemplo.com"
          defaultValue={values?.email}
          required
        />
      </FormField>
      <SubmitButton size="lg" className="w-full" pendingText="Enviando…">
        Enviarme el link
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        <Link href={routes.login} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </form>
  );
}
