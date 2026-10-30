"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { type ActionState, errorState, formValues, parseForm, successState } from "@/lib/action-result";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { createOwnPlayerSchema, playerFormSchema, playerRefSchema } from "./schemas";

async function groupSlug(groupId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("slug").eq("id", groupId).maybeSingle();
  return data?.slug ?? null;
}

/** Alta o edición de una ficha (admin). */
export async function savePlayerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(playerFormSchema, formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.data;

  const supabase = await createClient();
  const { data: playerId, error } = await supabase.rpc("save_player", {
    p_group_id: v.groupId,
    p_player_id: v.playerId,
    p_nickname: v.nickname,
    p_full_name: v.fullName,
    p_dominant_foot: v.dominantFoot,
    p_base_rating: v.baseRating,
    p_primary_position: v.primaryPosition,
    p_secondary_position: v.secondaryPosition,
  });
  if (error || !playerId) {
    const message = toUserMessage(error);
    const fieldErrors = message.includes("apodo") ? { nickname: [message] } : undefined;
    return errorState(message, { fieldErrors, values: formValues(formData) });
  }

  const slug = await groupSlug(v.groupId);
  if (!slug) return errorState(toUserMessage(null));
  revalidatePath(routes.groupPlayers(slug));

  if (formData.get("intent") === "save-and-new") {
    redirect(`${routes.newPlayer(slug)}?creado=${encodeURIComponent(v.nickname)}`, RedirectType.replace);
  }
  // ?nueva=1: la ficha ofrece mandarle la invitación a quien se acaba de cargar.
  redirect(`${routes.player(slug, playerId)}?nueva=1`, RedirectType.replace);
}

export async function setPlayerActiveAction(input: unknown, active: boolean): Promise<MutationResult> {
  const parsed = playerRefSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .update({ is_active: active })
    .eq("id", parsed.data.playerId)
    .eq("group_id", parsed.data.groupId)
    .select("id")
    .maybeSingle();
  if (error) return fail(toUserMessage(error));
  if (!data) return fail(toUserMessage({ message: "forbidden" }));

  revalidatePath("/g/[slug]", "layout");
  return ok(active ? "Jugador reactivado." : "Jugador desactivado: no aparecerá al armar partidos.");
}

/** Un invitado pasa a ser del plantel: aparece en la lista, los rankings y los logros. */
export async function promoteGuestAction(input: unknown): Promise<MutationResult> {
  const parsed = playerRefSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .update({ is_guest: false })
    .eq("id", parsed.data.playerId)
    .eq("group_id", parsed.data.groupId)
    .select("id")
    .maybeSingle();
  if (error) return fail(toUserMessage(error));
  if (!data) return fail(toUserMessage({ message: "forbidden" }));

  revalidatePath("/g/[slug]", "layout");
  return ok("Listo: ya es parte del plantel.");
}

export async function deletePlayerAction(input: unknown): Promise<MutationResult> {
  const parsed = playerRefSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .delete()
    .eq("id", parsed.data.playerId)
    .eq("group_id", parsed.data.groupId)
    .select("id");
  if (error) return fail(toUserMessage(error));
  if (!data?.length) return fail(toUserMessage({ message: "forbidden" }));

  const slug = await groupSlug(parsed.data.groupId);
  if (slug) {
    revalidatePath(routes.groupPlayers(slug));
    redirect(routes.groupPlayers(slug), RedirectType.replace);
  }
  return ok("Jugador eliminado.");
}

export async function claimPlayerAction(input: unknown): Promise<MutationResult> {
  const parsed = playerRefSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_player", { p_player_id: parsed.data.playerId });
  if (error) return fail(toUserMessage(error));

  const slug = await groupSlug(parsed.data.groupId);
  if (!slug) return ok();
  revalidatePath(routes.group(slug), "layout");
  redirect(`${routes.group(slug)}?ficha=vinculada`, RedirectType.replace);
}

export async function createOwnPlayerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(createOwnPlayerSchema, formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_own_player", {
    p_group_id: v.groupId,
    p_nickname: v.nickname,
    p_primary_position: v.primaryPosition,
    p_secondary_position: v.secondaryPosition,
    p_dominant_foot: v.dominantFoot,
  });
  if (error) {
    const message = toUserMessage(error);
    const fieldErrors = message.includes("apodo")
      ? { nickname: [`${message} Si sos vos, reclamá esa ficha en la lista de arriba.`] }
      : undefined;
    return errorState(message, { fieldErrors, values: formValues(formData) });
  }

  const slug = await groupSlug(v.groupId);
  if (!slug) return successState();
  revalidatePath(routes.group(slug), "layout");
  redirect(`${routes.group(slug)}?ficha=creada`, RedirectType.replace);
}
