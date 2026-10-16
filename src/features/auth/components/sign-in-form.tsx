"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { errorState, idleState } from "@/lib/action-result";
import { routes } from "@/lib/routes";
import { signInAction } from "../actions";

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const linkFailed = searchParams.get("error") === "link";
  const [state, action] = useActionState(signInAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {linkFailed && state.status === "idle" ? (
        <FormMessage state={errorState("El link venció o ya se usó. Pedí uno nuevo o ingresá con tu contraseña.")} />
      ) : (
        <FormMessage state={state} />
      )}

      <FormField id="email" label="Email" errors={errors?.email}>
        <Input
          {...fieldAria("email", errors?.email)}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="vos@ejemplo.com"
          defaultValue={values?.email}
          required
        />
      </FormField>

      <FormField
        id="password"
        label={
          <span className="flex w-full items-center justify-between">
            Contraseña
            <Link href={routes.forgotPassword} className="text-xs font-normal text-primary hover:underline">
              ¿La olvidaste?
            </Link>
          </span>
        }
        errors={errors?.password}
      >
        <PasswordInput {...fieldAria("password", errors?.password)} autoComplete="current-password" required />
      </FormField>

      <SubmitButton size="lg" className="w-full" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link
          href={next ? `${routes.signup}?next=${encodeURIComponent(next)}` : routes.signup}
          className="font-medium text-primary hover:underline"
        >
          Registrate
        </Link>
      </p>
    </form>
  );
}
