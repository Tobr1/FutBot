"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult } from "@/lib/mutation-result";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { submitRatingsSchema } from "./schemas";

/**
 * Emite o actualiza (hasta el cierre) las calificaciones y el voto al MVP de
 * la cuenta actual, en una sola transacción. La RPC verifica que jugó, que no
 * se vota a sí mismo y que la votación está abierta.
 */
export async function submitRatingsAction(input: unknown): Promise<MutationResult> {
  const parsed = submitRatingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const { matchId, ratings, mvpPlayerId } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_match_votes", {
    p_match_id: matchId,
    p_ratings: ratings.map((r) => ({ player_id: r.playerId, score: r.score })),
    p_mvp_player_id: mvpPlayerId ?? undefined,
  });
  if (error) return fail(toUserMessage(error));

  // El grupo sale del partido (RLS), no del groupId que manda el cliente.
  const { data: match } = await supabase.from("matches").select("group_id").eq("id", matchId).maybeSingle();
  const { data: group } = match
    ? await supabase.from("groups").select("slug").eq("id", match.group_id).maybeSingle()
    : { data: null };
  revalidatePath("/g/[slug]", "layout");
  if (group) redirect(`${routes.match(group.slug, matchId)}?votos=1`, RedirectType.replace);
  return { ok: true, message: "¡Votos enviados!" };
}
