"use client";

import { Bell, BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ListGroup } from "@/components/shared/list-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PUSH_EVENT_LABELS, PUSH_EVENTS, type PushEvent } from "@/domain/notifications/messages";
import { currentSubscription, pushSupport, serializeSubscription, subscribeThisDevice } from "@/lib/push/client";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
  setNotificationPreferenceAction,
} from "../actions";

type DeviceState = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

const STATUS: Record<Exclude<DeviceState, "loading">, { badge: string; tone: "primary" | "neutral" | "warning"; text: string }> = {
  on: { badge: "Activados", tone: "primary", text: "Te llegan a este dispositivo aunque no tengas la app abierta." },
  off: { badge: "Desactivados", tone: "neutral", text: "Activalos para enterarte de partidos y votaciones al toque." },
  denied: {
    badge: "Bloqueados",
    tone: "warning",
    text: "Bloqueaste los avisos de FulBot en este navegador. Habilitalos desde los permisos del sitio y volvé acá.",
  },
  "ios-needs-install": {
    badge: "Instalá la app",
    tone: "neutral",
    text: "En iPhone los avisos llegan con FulBot agregada a la pantalla de inicio. Instalala y activalos desde ahí.",
  },
  unsupported: { badge: "No disponible", tone: "neutral", text: "Este navegador no permite avisos. Probá desde Chrome o Safari." },
};

function readDeviceState(): Promise<DeviceState> | DeviceState {
  const support = pushSupport();
  if (support !== "supported") return support;
  if (Notification.permission === "denied") return "denied";
  return currentSubscription().then((s) => (s && Notification.permission === "granted" ? "on" : "off"));
}

/** Avisos al celular: activar en este dispositivo, probar y elegir cuáles. */
export function PushSettings({ preferences, configured }: { preferences: Record<PushEvent, boolean>; configured: boolean }) {
  const [device, setDevice] = useState<DeviceState>("loading");
  const [prefs, setPrefs] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    void Promise.resolve(readDeviceState())
      .catch((): DeviceState => "off")
      .then((state) => {
        if (alive) setDevice(state);
      });
    return () => {
      alive = false;
    };
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        const subscription = await subscribeThisDevice();
        if (!subscription) {
          setDevice(Notification.permission === "denied" ? "denied" : "off");
          return;
        }
        const result = await savePushSubscriptionAction(serializeSubscription(subscription));
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setDevice("on");
        toast.success(result.message);
      } catch {
        toast.error("No pudimos activar los avisos en este dispositivo. Probá de nuevo.");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      const subscription = await currentSubscription().catch(() => null);
      if (subscription) {
        await deletePushSubscriptionAction({ endpoint: subscription.endpoint });
        await subscription.unsubscribe().catch(() => false);
      }
      setDevice("off");
      toast.success("Listo: este dispositivo ya no recibe avisos.");
    });
  }

  function test() {
    startTransition(async () => {
      const result = await sendTestPushAction();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function toggle(event: PushEvent, enabled: boolean) {
    setPrefs((p) => ({ ...p, [event]: enabled }));
    startTransition(async () => {
      const result = await setNotificationPreferenceAction({ event, enabled });
      if (!result.ok) {
        setPrefs((p) => ({ ...p, [event]: !enabled }));
        toast.error(result.message);
      }
    });
  }

  const status = device === "loading" ? null : STATUS[device];

  return (
    <div className="space-y-3">
      <div className="panel space-y-4 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
            {device === "on" ? (
              <BellRing className="size-6" aria-hidden="true" />
            ) : device === "denied" ? (
              <BellOff className="size-6" aria-hidden="true" />
            ) : device === "ios-needs-install" ? (
              <Smartphone className="size-6" aria-hidden="true" />
            ) : (
              <Bell className="size-6" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold">En este dispositivo</h3>
              {status && (
                <Badge tone={status.tone} size="sm">
                  {status.badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {status?.text ?? "Revisando este dispositivo…"}
            </p>
          </div>
        </div>

        {!configured && (
          <p className="text-xs text-muted-foreground">Los avisos todavía no están configurados en el servidor.</p>
        )}

        {device === "off" && (
          <Button type="button" size="lg" className="w-full lg:w-auto" onClick={enable} disabled={isPending || !configured}>
            {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Bell aria-hidden="true" />}
            Activar avisos
          </Button>
        )}

        {device === "on" && (
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Button type="button" variant="secondary" onClick={test} disabled={isPending || !configured}>
              {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              Probar
            </Button>
            <Button type="button" variant="ghost" onClick={disable} disabled={isPending}>
              <BellOff aria-hidden="true" />
              Desactivar
            </Button>
          </div>
        )}
      </div>

      <ListGroup label="Qué avisos recibir">
        {PUSH_EVENTS.map((event) => {
          const id = `aviso-${event}`;
          return (
            <li key={event} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-[15px] font-semibold">{PUSH_EVENT_LABELS[event].title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{PUSH_EVENT_LABELS[event].description}</span>
              </label>
              <Switch id={id} checked={prefs[event]} onCheckedChange={(checked) => toggle(event, checked)} />
            </li>
          );
        })}
      </ListGroup>
    </div>
  );
}
