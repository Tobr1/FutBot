"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, errorState, formValues, parseForm, successState } from "@/lib/action-result";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { createClient } from "@/lib/supabase/server";
import { deleteTeamRuleSchema, teamRuleSchema } from "./schemas";

/** Las reglas se leen en ajustes y en el armado de cada partido. */
function revalidateGroup() {
  revalidatePath("/g/[slug]", "layout");
}

/** Nueva regla "juntos / separados" (RLS: solo admins insertan). */
export async function createTeamRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(teamRuleSchema, formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("team_constraints").insert({
    group_id: v.groupId,
    player_a: v.playerA,
    player_b: v.playerB,
    kind: v.kind,
    note: v.note,
  });
  if (error) return errorState(toUserMessage(error), { values: formValues(formData) });

  revalidateGroup();
  return successState("Regla guardada.");
}

/** Borra una regla (RLS: solo admins). */
export async function deleteTeamRuleAction(input: unknown): Promise<MutationResult> {
  const parsed = deleteTeamRuleSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { groupId, ruleId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.from("team_constraints").delete().eq("id", ruleId).eq("group_id", groupId).select("id");
  if (error) return fail(toUserMessage(error));
  if (!data?.length) return fail(toUserMessage({ message: "forbidden" }));

  revalidateGroup();
  return ok("Regla borrada.");
}
