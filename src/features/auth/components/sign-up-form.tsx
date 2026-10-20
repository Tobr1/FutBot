"use client";

import { MailCheck } from "lucide-react";
import { Suspense, useActionState, useRef } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { routes } from "@/lib/routes";
import { signUpAction } from "../actions";
import { AuthSwitchLink, AuthSwitchLinkFallback } from "./auth-switch-link";
import { InvitationNextHint, NextPathInput } from "./next-path-input";
import { ResendConfirmationButton } from "./resend-confirmation-button";

/** Formulario de registro. Igual que el de ingreso, prerenderizable (ver SignInForm). */
export function SignUpForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(signUpAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  useFormErrorFocus(formRef, state);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-2xl bg-success/15 text-success ring-1 ring-success/30">
          <MailCheck className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-display text-display-md font-extrabold tracking-wide uppercase">Revisá tu email</h2>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Suspense fallback={null}>
            <InvitationNextHint />
          </Suspense>
          <p className="text-xs text-muted-foreground">Si no lo ves en unos minutos, buscá en spam o promociones.</p>
        </div>
        {state.values?.email && (
          <div className="grid w-full gap-2">
            <ResendConfirmationButton email={state.values.email} next={state.values.next} startCoolingDown />
            <p className="text-xs text-muted-foreground">
              ¿Escribiste mal el email? Volvé a <a href={routes.signup} className="font-medium text-primary underline-offset-4 hover:underline">crear la cuenta</a> con el correcto.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <Suspense fallback={null}>
        <NextPathInput />
      </Suspense>
      <FormMessage state={state} />

      <FormField id="displayName" label="Tu nombre" hint="Así te van a ver tus compañeros." errors={errors?.displayName}>
        <Input
          {...fieldAria("displayName", errors?.displayName, true)}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          placeholder="Ej.: Agustín"
          defaultValue={values?.displayName}
          maxLength={40}
          required
        />
      </FormField>

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

      <FormField id="password" label="Contraseña" hint="Mínimo 8 caracteres, con letras y números." errors={errors?.password}>
        <PasswordInput
          {...fieldAria("password", errors?.password, true)}
          autoComplete="new-password"
          enterKeyHint="done"
          required
        />
      </FormField>

      <SubmitButton size="lg" className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Suspense fallback={<AuthSwitchLinkFallback href={routes.login} label="Ingresá" />}>
          <AuthSwitchLink href={routes.login} label="Ingresá" />
        </Suspense>
      </p>
    </form>
  );
}
