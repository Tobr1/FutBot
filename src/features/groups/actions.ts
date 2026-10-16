"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, errorState, formValues, parseForm, successState } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { createGroupSchema, groupSettingsSchema, memberRoleSchema, newSeasonSchema, removeMemberSchema } from "./schemas";

export async function createGroupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(createGroupSchema, formData);
  if (!parsed.ok) return parsed.state;
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_players_per_team: parsed.data.playersPerTeam,
    p_player_nickname: parsed.data.nickname,
  });
  if (error || !data) return errorState(toUserMessage(error), { values: formValues(formData) });

  revalidatePath(routes.dashboard);
  redirect(`${routes.group(data.slug)}?bienvenida=1`);
}

export async function updateGroupSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(groupSettingsSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { groupId, ...values } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({
      name: values.name,
      description: values.description ?? null,
      default_players_per_team: values.defaultPlayersPerTeam,
      voting_window_hours: values.votingWindowHours,
      ranking_min_matches: values.rankingMinMatches,
    })
    .eq("id", groupId)
    .select("slug")
    .maybeSingle();

  if (error) return errorState(toUserMessage(error), { values: formValues(formData) });
  if (!data) return errorState(toUserMessage({ message: "forbidden" }));

  revalidatePath(routes.group(data.slug), "layout");
  return successState("Cambios guardados.");
}

export async function changeMemberRoleAction(input: unknown): Promise<MutationResult> {
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { groupId, profileId, role } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("profile_id", profileId)
    .select("group_id")
    .maybeSingle();
  if (error) return fail(toUserMessage(error));
  if (!data) return fail(toUserMessage({ message: "forbidden" }));

  revalidatePath("/g/[slug]", "layout");
  return ok(role === "admin" ? "Ahora es administrador." : "Ahora es jugador.");
}

export async function removeMemberAction(input: unknown): Promise<MutationResult> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const { groupId, profileId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", profileId)
    .select("group_id");
  if (error) return fail(toUserMessage(error));
  if (!data?.length) return fail(toUserMessage({ message: "forbidden" }));

  revalidatePath("/g/[slug]", "layout");
  return ok("Miembro quitado del grupo. Su ficha y estadísticas se conservan.");
}

export async function leaveGroupAction(groupId: string): Promise<MutationResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("profile_id", user.id);
  if (error) return fail(toUserMessage(error));

  revalidatePath(routes.dashboard);
  redirect(routes.dashboard);
}

export async function startNewSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(newSeasonSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_new_season", {
    p_group_id: parsed.data.groupId,
    p_name: parsed.data.name,
    p_starts_on: parsed.data.startsOn,
  });
  if (error) return errorState(toUserMessage(error), { values: formValues(formData) });

  revalidatePath("/g/[slug]", "layout");
  return successState(`Arrancó "${parsed.data.name}".`);
}
