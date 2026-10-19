"use server";

import { RedirectType, redirect } from "next/navigation";
import { type ActionState, errorState, parseForm, successState } from "@/lib/action-result";
import { toAuthMessage } from "@/lib/errors";
import { getRequestOrigin } from "@/lib/origin";
import { routes, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(signInSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return errorState(toAuthMessage(error), { values: { email, next: next ?? "" } });
  }

  redirect(safeNextPath(next), RedirectType.replace);
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(signUpSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { displayName, email, password } = parsed.data;
  const next = safeNextPath(parsed.data.next);

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return errorState(toAuthMessage(error), { values: { displayName, email, next } });
  }

  // Sin confirmación de email (desarrollo local) ya hay sesión.
  if (data.session) redirect(next, RedirectType.replace);

  return successState(`Te enviamos un email a ${email}. Abrí el link para activar tu cuenta.`);
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(forgotPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(routes.resetPassword)}`,
  });

  // Solo se informan límites de envío: no revelar si el email existe.
  if (error?.code?.startsWith("over_")) return errorState(toAuthMessage(error));

  return successState("Si hay una cuenta con ese email, te llegará un link para crear una nueva contraseña.");
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(resetPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(toAuthMessage(error));

  redirect(`${routes.dashboard}?clave=actualizada`, RedirectType.replace);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.home, RedirectType.replace);
}
