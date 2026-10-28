"use client";

import { useEffect } from "react";
import { currentSubscription, pushSupport, registerServiceWorker, serializeSubscription } from "@/lib/push/client";
import { savePushSubscriptionAction } from "../actions";

const SYNCED_KEY = "fb:push-synced";

/**
 * Con los avisos ya aceptados, mantiene el service worker al día y vuelve a
 * guardar la suscripción una vez por sesión del navegador: así sigue
 * asociada a la cuenta que está usando el dispositivo aunque el navegador
 * la haya renovado o se haya cambiado de cuenta.
 */
export function PushSync() {
  useEffect(() => {
    if (pushSupport() !== "supported" || Notification.permission !== "granted") return;
    void (async () => {
      try {
        await registerServiceWorker();
        const subscription = await currentSubscription();
        if (!subscription) return;
        const key = `${SYNCED_KEY}:${subscription.endpoint.slice(-24)}`;
        if (sessionStorage.getItem(key)) return;
        const result = await savePushSubscriptionAction(serializeSubscription(subscription));
        if (result.ok) sessionStorage.setItem(key, "1");
      } catch {
        // Sin service worker o sin storage: los avisos se reactivan desde el perfil.
      }
    })();
  }, []);

  return null;
}
