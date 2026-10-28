"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { PushEvent } from "@/domain/notifications/messages";
import { toUserMessage } from "@/lib/errors";
import { fail, type MutationResult, ok } from "@/lib/mutation-result";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { endpointSchema, preferenceSchema, pushSubscriptionSchema } from "./schemas";
import { sendTestPush } from "./send";

/** Guarda la suscripción de este dispositivo para mi cuenta. */
export async function savePushSubscriptionAction(input: unknown): Promise<MutationResult> {
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("Este navegador no devolvió una suscripción válida.");
  const { endpoint, keys } = parsed.data;
  const userAgent = (await headers()).get("user-agent");

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: userAgent?.slice(0, 300) ?? undefined,
  });
  if (error) return fail(toUserMessage(error));
  return ok("Listo: vas a recibir los avisos en este dispositivo.");
}

/** Saca este dispositivo de los avisos. */
export async function deletePushSubscriptionAction(input: unknown): Promise<MutationResult> {
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_push_subscription", { p_endpoint: parsed.data.endpoint });
  if (error) return fail(toUserMessage(error));
  return ok("Listo: este dispositivo ya no recibe avisos.");
}

/** Activa o desactiva un tipo de aviso para mi cuenta (en todos mis dispositivos). */
export async function setNotificationPreferenceAction(input: unknown): Promise<MutationResult> {
  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_notification_preference", {
    p_event: parsed.data.event as PushEvent,
    p_enabled: parsed.data.enabled,
  });
  if (error) return fail(toUserMessage(error));
  revalidatePath(routes.profile);
  return ok();
}

/** Manda un aviso de prueba a mis dispositivos. */
export async function sendTestPushAction(): Promise<MutationResult> {
  const supabase = await createClient();
  const result = await sendTestPush(supabase, routes.profile);
  if (result === "not_configured") return fail("Los avisos todavía no están configurados en el servidor.");
  if (result === "no_devices") return fail("No encontramos dispositivos con avisos activados. Activalos de nuevo.");
  return ok("Aviso enviado. Debería llegarte en unos segundos.");
}
