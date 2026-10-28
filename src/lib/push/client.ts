"use client";

import { isIOS, isStandaloneDisplay } from "@/lib/pwa/platform";
import { SERVICE_WORKER_URL, VAPID_PUBLIC_KEY } from "./config";

/**
 * Lado del navegador de los avisos: soporte, service worker y suscripción.
 * En iPhone/iPad los avisos solo existen con la app agregada a la pantalla de inicio.
 */

export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasApis) return "supported";
  const standalone = isStandaloneDisplay({
    matchMedia: (query) => window.matchMedia(query),
    navigator: navigator as Navigator & { standalone?: boolean },
  });
  return isIOS(navigator) && !standalone ? "ios-needs-install" : "unsupported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/", updateViaCache: "none" });
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Pide permiso (si hace falta) y suscribe este dispositivo. null si el usuario no aceptó. */
export async function subscribeThisDevice(): Promise<PushSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

/** Forma serializable que esperan las Server Actions. */
export const serializeSubscription = (subscription: PushSubscription) => subscription.toJSON();
