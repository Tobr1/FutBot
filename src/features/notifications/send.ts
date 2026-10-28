import "server-only";
import { createHash } from "node:crypto";
import webpush, { type PushSubscription } from "web-push";
import {
  matchCreatedMessage,
  type PushEvent,
  type PushMessage,
  testMessage,
  validationRequestMessage,
  votingOpenMessage,
} from "@/domain/notifications/messages";
import { getSiteUrl } from "@/lib/env";
import { VAPID_PUBLIC_KEY } from "@/lib/push/config";
import { routes } from "@/lib/routes";
import type { ServerSupabase } from "@/lib/supabase/server";

/**
 * Envío de avisos al celular. Se llama desde after() en las Server Actions,
 * con el cliente de la sesión de quien hizo la acción: la base decide a quién
 * avisar (get_push_targets) y exige además la clave de despacho del servidor.
 * Un aviso que falla nunca rompe la acción que lo disparó.
 */

interface PushServerConfig {
  privateKey: string;
  /** Clave de despacho: se deriva de la privada; en la base está su sha256. */
  dispatchKey: string;
}

function serverConfig(): PushServerConfig | null {
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!privateKey) return null;
  return {
    privateKey,
    dispatchKey: createHash("sha256").update(`fulbot-push-dispatch:${privateKey}`).digest("hex"),
  };
}

export const isPushConfigured = () => serverConfig() !== null;

type Target = { endpoint: string; p256dh: string; auth: string };

/** Manda un aviso a cada dispositivo; devuelve los endpoints dados de baja (404/410). */
async function deliver(config: PushServerConfig, targets: Target[], message: PushMessage): Promise<string[]> {
  const payload = JSON.stringify(message);
  const options = {
    vapidDetails: { subject: getSiteUrl(), publicKey: VAPID_PUBLIC_KEY, privateKey: config.privateKey },
    TTL: 60 * 60 * 24,
    urgency: "normal" as const,
    topic: message.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
  };
  const gone: string[] = [];
  await Promise.all(
    targets.map(async (t) => {
      const subscription: PushSubscription = { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } };
      try {
        await webpush.sendNotification(subscription, payload, options);
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(t.endpoint);
        else console.error("[push] envío fallido", status ?? error);
      }
    }),
  );
  return gone;
}

/** Arma el texto del aviso con lo que la sesión puede leer (RLS). */
async function buildMessage(supabase: ServerSupabase, event: PushEvent, refId: string): Promise<PushMessage | null> {
  if (event === "validation_request") {
    const { data: player } = await supabase.from("players").select("nickname, groups(name, slug)").eq("id", refId).maybeSingle();
    if (!player?.groups) return null;
    return validationRequestMessage({
      groupName: player.groups.name,
      nickname: player.nickname,
      url: routes.validateTeammates(player.groups.slug),
      playerId: refId,
    });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("scheduled_at, venue, groups(name, slug, timezone), teams(side, score)")
    .eq("id", refId)
    .maybeSingle();
  if (!match?.groups) return null;
  const { name, slug, timezone } = match.groups;

  if (event === "match_created") {
    return matchCreatedMessage({
      groupName: name,
      scheduledAt: match.scheduled_at,
      timeZone: timezone,
      venue: match.venue,
      url: routes.match(slug, refId),
      matchId: refId,
    });
  }
  const score = (side: "a" | "b") => match.teams.find((t) => t.side === side)?.score ?? null;
  return votingOpenMessage({
    groupName: name,
    scheduledAt: match.scheduled_at,
    timeZone: timezone,
    scoreA: score("a"),
    scoreB: score("b"),
    url: routes.matchVote(slug, refId),
    matchId: refId,
  });
}

/** Avisa de un evento que acaba de provocar la sesión. No tira errores. */
export async function dispatchPush(supabase: ServerSupabase, event: PushEvent, refId: string): Promise<void> {
  const config = serverConfig();
  if (!config) return;
  try {
    const { data, error } = await supabase.rpc("get_push_targets", { p_key: config.dispatchKey, p_event: event, p_ref: refId });
    if (error) {
      console.error("[push] destinatarios", error.message);
      return;
    }
    const targets = data.filter((r): r is Target => Boolean(r.endpoint && r.p256dh && r.auth));
    if (targets.length === 0) return;

    const message = await buildMessage(supabase, event, refId);
    if (!message) return;
    const gone = await deliver(config, targets, message);
    if (gone.length > 0) {
      await supabase.rpc("prune_push_subscriptions", { p_key: config.dispatchKey, p_endpoints: gone });
    }
  } catch (error) {
    console.error("[push]", error);
  }
}

/** Aviso de prueba a mis propios dispositivos (RLS: solo leo los míos). */
export async function sendTestPush(supabase: ServerSupabase, url: string): Promise<"sent" | "no_devices" | "not_configured"> {
  const config = serverConfig();
  if (!config) return "not_configured";
  const { data } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!data || data.length === 0) return "no_devices";
  const gone = await deliver(config, data, testMessage(url));
  if (gone.length > 0) {
    for (const endpoint of gone) await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
  }
  return gone.length === data.length ? "no_devices" : "sent";
}
