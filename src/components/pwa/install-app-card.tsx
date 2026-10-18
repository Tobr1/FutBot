"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  getInstallMode,
  INSTALL_DISMISSED_KEY,
  INSTALLABLE_EVENT,
  type InstallMode,
  isStandaloneDisplay,
} from "@/lib/pwa/platform";
import { cn } from "@/lib/utils";

type CardState = "hidden" | InstallMode;

/** Evento interno para releer el estado (cierre, prompt usado, app instalada). */
const CHANGE_EVENT = "fb:install-change";

const COARSE_POINTER = "(pointer: coarse)";
const STANDALONE = "(display-mode: standalone)";

// Respaldo en memoria si localStorage no está disponible (modo privado, bloqueos).
let dismissedInMemory = false;
let installedInSession = false;

function isDismissed(): boolean {
  if (dismissedInMemory || installedInSession) return true;
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function isInstalledDisplay(): boolean {
  return isStandaloneDisplay({
    matchMedia: (query) => window.matchMedia(query),
    navigator: window.navigator as Navigator & { standalone?: boolean },
  });
}

function getSnapshot(): CardState {
  if (!window.matchMedia(COARSE_POINTER).matches) return "hidden";
  if (isInstalledDisplay() || isDismissed()) return "hidden";
  return getInstallMode(window.navigator, Boolean(window.__fbInstallPrompt)) ?? "hidden";
}

function getServerSnapshot(): CardState {
  return "hidden";
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

function dismiss() {
  dismissedInMemory = true;
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    // Sin almacenamiento: queda cerrada hasta recargar.
  }
  notifyChange();
}

async function promptInstall() {
  const promptEvent = window.__fbInstallPrompt;
  if (!promptEvent) return;
  // El evento sirve una sola vez: Chrome vuelve a dispararlo si corresponde.
  window.__fbInstallPrompt = undefined;
  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") installedInSession = true;
  } catch {
    // El navegador rechazó el diálogo; no hay nada que mostrar.
  }
  notifyChange();
}

/**
 * Invitación a instalar la app, solo en celulares y si todavía no está
 * instalada. iOS: instrucciones de Compartir. Android: diálogo nativo.
 * WhatsApp/Instagram: pedir que la abran en el navegador. En el servidor y en
 * la hidratación no renderiza nada.
 */
export function InstallAppCard({ className }: { className?: string }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (state === "hidden") return null;

  return (
    <section aria-label="Instalar la app" className={cn("panel relative rounded-xl p-4 pr-14", className)}>
      <div className="flex items-start gap-3">
        <LogoMark className="size-11 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1 pt-0.5">
          {state === "ios" && (
            <p className="text-[15px] leading-snug font-semibold">
              Instalá FUTBOLEROS: tocá Compartir{" "}
              <Share className="inline size-4 -translate-y-px align-middle text-primary" aria-hidden="true" /> y después
              “Agregar a inicio”{" "}
              <SquarePlus className="inline size-4 -translate-y-px align-middle text-primary" aria-hidden="true" />
            </p>
          )}

          {state === "in-app" && (
            <p className="text-[15px] leading-snug font-semibold">Abrilo en Safari o Chrome para instalar la app</p>
          )}

          {state === "prompt" && (
            <>
              <p className="text-[15px] leading-snug font-semibold">Instalá FUTBOLEROS</p>
              <p className="text-sm text-muted-foreground">Entrás en un toque y a pantalla completa.</p>
              <Button type="button" className="mt-2" onClick={promptInstall}>
                <Download aria-hidden="true" />
                Instalar app
              </Button>
            </>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Cerrar"
        onClick={dismiss}
        className="absolute top-2 right-2 text-muted-foreground"
      >
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}
