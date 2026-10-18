"use client";

import Link from "next/link";
import { Suspense, useActionState, useRef } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { routes } from "@/lib/routes";
import { signInAction } from "../actions";
import { AuthSwitchLink, AuthSwitchLinkFallback } from "./auth-switch-link";
import { LinkErrorNotice } from "./link-error-notice";
import { NextPathInput } from "./next-path-input";

/**
 * Formulario de ingreso. No lee la URL en su nivel superior: lo que depende de
 * los parámetros (next, ?error=link) va en piezas chicas dentro de <Suspense>,
 * así los campos ya vienen en el HTML prerenderizado.
 */
export function SignInForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(signInAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  useFormErrorFocus(formRef, state);

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <Suspense fallback={null}>
        <NextPathInput />
      </Suspense>
      <Suspense fallback={null}>
        <LinkErrorNotice show={state.status === "idle"} />
      </Suspense>
      <FormMessage state={state} />

      <FormField id="email" label="Email" errors={errors?.email}>
        <Input
          {...fieldAria("email", errors?.email)}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="vos@ejemplo.com"
          defaultValue={values?.email}
          required
        />
      </FormField>

      <FormField
        id="password"
        label="Contraseña"
        errors={errors?.password}
        aside={
          <Link
            href={routes.forgotPassword}
            className="-my-2 inline-flex min-h-11 items-center text-xs text-primary hover:underline"
          >
            ¿La olvidaste?
          </Link>
        }
      >
        <PasswordInput
          {...fieldAria("password", errors?.password)}
          autoComplete="current-password"
          enterKeyHint="go"
          required
        />
      </FormField>

      <SubmitButton size="lg" className="w-full" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Suspense fallback={<AuthSwitchLinkFallback href={routes.signup} label="Registrate" />}>
          <AuthSwitchLink href={routes.signup} label="Registrate" />
        </Suspense>
      </p>
    </form>
  );
}
