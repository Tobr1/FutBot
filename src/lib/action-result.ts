import type { z } from "zod";

/**
 * Estado uniforme que devuelven las Server Actions usadas con useActionState.
 * `values` permite repoblar el formulario cuando la validación falla.
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string; values?: Record<string, string> }
  | {
      status: "error";
      message: string;
      /** Clave estable del error (p. ej. "email_not_confirmed") para reaccionar en la UI. */
      code?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: Record<string, string>;
    };

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, extra: Omit<Extract<ActionState, { status: "error" }>, "status" | "message"> = {}): ActionState {
  return { status: "error", message, ...extra };
}

export function successState(message?: string, values?: Record<string, string>): ActionState {
  return values ? { status: "success", message, values } : { status: "success", message };
}

/** Devuelve los valores de texto del FormData para repoblar el formulario. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$") && !/password/i.test(key)) values[key] = value;
  }
  return values;
}

/** Valida FormData con un esquema zod y arma el estado de error si falla. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.infer<S> } | { ok: false; state: ActionState } {
  // Las claves "$..." son internas de React (Server Actions).
  const raw = Object.fromEntries([...formData.entries()].filter(([key]) => !key.startsWith("$")));
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    ok: false,
    state: errorState("Revisá los datos marcados.", { fieldErrors, values: formValues(formData) }),
  };
}
