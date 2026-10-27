"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { createClient } from "@/lib/supabase/server";
import { predictionSchema } from "./schemas";

/** Guarda (o cambia) mi pronóstico de un partido que todavía no empezó. */
export async function savePredictionAction(input: unknown): Promise<MutationResult> {
  const parsed = predictionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_match_prediction", {
    p_match_id: parsed.data.matchId,
    p_score_a: parsed.data.scoreA,
    p_score_b: parsed.data.scoreB,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/g/[slug]", "layout");
  return ok("Pronóstico guardado. Lo podés cambiar hasta que empiece el partido.");
}
