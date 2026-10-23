"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { createClient } from "@/lib/supabase/server";
import { selfAssessmentSchema, validationSchema } from "./schemas";

/** Guarda la autoevaluación de mi ficha en el grupo (la RPC verifica que es mía). */
export async function saveSelfAssessmentAction(input: unknown): Promise<MutationResult> {
  const parsed = selfAssessmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_self_assessment", {
    p_group_id: parsed.data.groupId,
    p_values: parsed.data.values,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/g/[slug]", "layout");
  return ok("Autoevaluación guardada. Ahora tus compañeros pueden validarla.");
}

/** Guarda (o actualiza) mi validación de los atributos de un compañero. */
export async function saveValidationAction(input: unknown): Promise<MutationResult> {
  const parsed = validationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_attribute_validation", {
    p_player_id: parsed.data.playerId,
    p_values: parsed.data.values,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/g/[slug]", "layout");
  return ok("Validación guardada. Es privada: solo cuenta en el promedio.");
}
