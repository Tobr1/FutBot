"use client";

import { Download, ExternalLink, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInstallLauncher } from "./install-guide";
import { dismissInstallCard, useInstallState } from "./install-store";

/**
 * Invitación a instalar la app, solo en celulares y si todavía no está
 * instalada. Un solo botón: en Android abre el diálogo nativo; en iPhone y en
 * navegadores internos (WhatsApp, Instagram) abre la guía paso a paso.
 * En el servidor y en la hidratación no renderiza nada.
 */
export function InstallAppCard({ className }: { className?: string }) {
  const { guide, showCard } = useInstallState();
  const { start, sheet } = useInstallLauncher(guide);

  if (!guide) return null;

  const inApp = guide === "in-app-ios" || guide === "in-app-android" || guide === "ios-other";

  return (
    <>
      {showCard && (
        <section aria-label="Instalar la app" className={cn("panel relative rounded-xl p-4 pr-14", className)}>
          <div className="flex items-start gap-3">
            <LogoMark className="size-11 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              <p className="text-[15px] leading-snug font-semibold">
                {inApp ? "Abrila en el navegador para instalarla" : "Instalá FulBot en tu celu"}
              </p>
              <p className="text-sm text-muted-foreground">
                {inApp ? "Desde esta app no se puede: te mostramos cómo en dos toques." : "Entrás en un toque, a pantalla completa, como cualquier app."}
              </p>
              <Button type="button" className="mt-2" onClick={start}>
                {inApp ? <ExternalLink aria-hidden="true" /> : <Download aria-hidden="true" />}
                {inApp ? "Cómo abrirla" : "Instalar app"}
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cerrar"
            onClick={dismissInstallCard}
            className="absolute top-2 right-2 text-muted-foreground"
          >
            <X aria-hidden="true" />
          </Button>
        </section>
      )}
      {sheet}
    </>
  );
}
