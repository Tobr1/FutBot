"use client";

import { useSyncExternalStore } from "react";
import {
  detectInstallGuide,
  INSTALL_DISMISSED_KEY,
  INSTALLABLE_EVENT,
  type InstallGuide,
  isStandaloneDisplay,
} from "@/lib/pwa/platform";

/**
 * Estado compartido de "instalar la app": qué guía corresponde en este
 * dispositivo, si la tarjeta de invitación se cerró y si ya está instalada.
 * Lo usan la tarjeta (InstallAppCard) y la fila permanente (InstallAppRow).
 */

export interface InstallState {
  /** null: ya instalada o el dispositivo no permite instalar. */
  guide: InstallGuide | null;
  /** La tarjeta de invitación se puede mostrar (táctil y no cerrada antes). */
  showCard: boolean;
}

const CHANGE_EVENT = "fb:install-change";
const COARSE_POINTER = "(pointer: coarse)";
const STANDALONE = "(display-mode: standalone)";

const SERVER_STATE: InstallState = { guide: null, showCard: false };

// Respaldo en memoria si localStorage no está disponible (modo privado, bloqueos).
let dismissedInMemory = false;
let installedInSession = false;
let cached: InstallState = SERVER_STATE;

function isDismissed(): boolean {
  if (dismissedInMemory) return true;
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function isInstalled(): boolean {
  if (installedInSession) return true;
  return isStandaloneDisplay({
    matchMedia: (query) => window.matchMedia(query),
    navigator: window.navigator as Navigator & { standalone?: boolean },
  });
}

function getSnapshot(): InstallState {
  const guide = isInstalled() ? null : detectInstallGuide(window.navigator, Boolean(window.__fbInstallPrompt));
  const showCard = guide !== null && window.matchMedia(COARSE_POINTER).matches && !isDismissed();
  // Misma referencia si no cambió: useSyncExternalStore compara por identidad.
  if (cached.guide !== guide || cached.showCard !== showCard) cached = { guide, showCard };
  return cached;
}

function getServerSnapshot(): InstallState {
  return SERVER_STATE;
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(COARSE_POINTER), window.matchMedia(STANDALONE)];
  const onInstalled = () => {
    installedInSession = true;
    window.__fbInstallPrompt = undefined;
    onChange();
  };

  window.addEventListener(INSTALLABLE_EVENT, onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("appinstalled", onInstalled);
  for (const query of queries) query.addEventListener("change", onChange);

  return () => {
    window.removeEventListener(INSTALLABLE_EVENT, onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("appinstalled", onInstalled);
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

/** Estado de instalación. En el servidor y la hidratación: nada que mostrar. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Cierra la tarjeta de invitación (la fila de Más/Perfil sigue disponible). */
export function dismissInstallCard() {
  dismissedInMemory = true;
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    // Sin almacenamiento: queda cerrada hasta recargar.
  }
  notifyChange();
}

/**
 * Abre el diálogo nativo de instalación (Android / escritorio).
 * Devuelve false si el navegador ya no lo ofrece (hay que mostrar la guía).
 */
export async function promptInstall(): Promise<boolean> {
  const promptEvent = window.__fbInstallPrompt;
  if (!promptEvent) return false;
  // El evento sirve una sola vez: Chrome vuelve a dispararlo si corresponde.
  window.__fbInstallPrompt = undefined;
  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") installedInSession = true;
  } catch {
    // El navegador rechazó el diálogo: el próximo intento muestra la guía.
  }
  notifyChange();
  return true;
}
