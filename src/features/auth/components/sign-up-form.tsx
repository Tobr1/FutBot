"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-result";
import { routes } from "@/lib/routes";
import { signUpAction } from "../actions";

export function SignUpForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [state, action] = useActionState(signUpAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-2xl bg-success/15 text-success ring-1 ring-success/30">
          <MailCheck className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-bold uppercase">Revisá tu email</h2>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <p className="text-xs text-muted-foreground">Si no lo ves en unos minutos, buscá en spam o promociones.</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />

      <FormField id="displayName" label="Tu nombre" hint="Así te van a ver tus compañeros." errors={errors?.displayName}>
        <Input
          {...fieldAria("displayName", errors?.displayName, true)}
          autoComplete="nickname"
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
          placeholder="vos@ejemplo.com"
          defaultValue={values?.email}
          required
        />
      </FormField>

      <FormField id="password" label="Contraseña" hint="Mínimo 8 caracteres, con letras y números." errors={errors?.password}>
        <PasswordInput {...fieldAria("password", errors?.password, true)} autoComplete="new-password" required />
      </FormField>

      <SubmitButton size="lg" className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={next ? `${routes.login}?next=${encodeURIComponent(next)}` : routes.login}
          className="font-medium text-primary hover:underline"
        >
          Ingresá
        </Link>
      </p>
    </form>
  );
}
