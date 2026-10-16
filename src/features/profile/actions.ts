"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { displayNameSchema } from "@/features/auth/schemas";
import { type ActionState, errorState, formValues, parseForm, successState } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseEnv } from "@/lib/env";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({ displayName: displayNameSchema });

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return parsed.state;
  const user = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id);
  if (error) return errorState(toUserMessage(error), { values: formValues(formData) });

  revalidatePath("/", "layout");
  return successState("Perfil actualizado.");
}

/**
 * Guarda la URL pública del avatar recién subido. Solo acepta archivos de la
 * carpeta propia del bucket `avatars` (la política de Storage ya lo exige al subir).
 */
export async function updateAvatarAction(url: string | null): Promise<MutationResult> {
  const user = await requireUser();
  if (url !== null) {
    const prefix = `${getSupabaseEnv().url}/storage/v1/object/public/avatars/${user.id}/`;
    if (typeof url !== "string" || !url.startsWith(prefix) || url.length > 500) return fail("Imagen inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return fail(toUserMessage(error));

  revalidatePath("/", "layout");
  return ok(url ? "Foto actualizada." : "Foto eliminada.");
}
