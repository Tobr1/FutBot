"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { getRequestOrigin } from "@/lib/origin";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { createInvitationSchema, TOKEN_PATTERN } from "./schemas";

export async function createInvitationAction(input: unknown): Promise<MutationResult<{ url: string }>> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const v = parsed.data;

  const expiresAt =
    v.expiresIn === "never" ? null : new Date(Date.now() + Number(v.expiresIn) * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      group_id: v.groupId,
      role: v.role,
      max_uses: v.maxUses ?? null,
      player_id: v.playerId ?? null,
      expires_at: expiresAt,
    })
    .select("token")
    .single();
  if (error) return fail(toUserMessage(error));

  revalidatePath("/g/[slug]/ajustes/invitaciones", "page");
  const origin = await getRequestOrigin();
  return ok("Invitación creada.", { url: `${origin}${routes.invitation(data.token)}` });
}

export async function revokeInvitationAction(invitationId: string): Promise<MutationResult> {
  if (!z.uuid().safeParse(invitationId).success) return fail("Datos inválidos.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) return fail(toUserMessage(error));
  if (!data) return fail("La invitación ya no estaba activa.");

  revalidatePath("/g/[slug]/ajustes/invitaciones", "page");
  return ok("Invitación revocada: el link deja de funcionar.");
}

export async function acceptInvitationAction(token: string): Promise<MutationResult> {
  if (!TOKEN_PATTERN.test(token)) return fail(toUserMessage({ message: "invitation_not_found" }));
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return fail(toUserMessage(error));
  const result = data?.[0];
  if (!result?.group_slug) return fail(toUserMessage(null));

  revalidatePath(routes.dashboard);
  redirect(result.needs_player ? routes.claimPlayer(result.group_slug) : `${routes.group(result.group_slug)}?bienvenida=1`, RedirectType.replace);
}
