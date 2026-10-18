"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/**
 * Aviso de conexión perdida (experimental.useOffline). Mientras dura, Next deja
 * en espera navegaciones y Server Actions y las reintenta al volver la señal.
 * La región viva queda montada (vacía y sin ocupar lugar) para que el lector de
 * pantalla anuncie el aviso cuando aparece.
 */
export function OfflineBanner() {
  const isOffline = useOffline();

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+3.75rem)] z-50 flex justify-center px-4"
    >
      {isOffline && (
        // Base opaca debajo del tinte para que el texto se lea sobre cualquier contenido.
        <div className="rounded-full bg-background shadow-elev-2">
          {/* min-h en vez de h fija: en pantallas de 320px el texto pasa a dos líneas. */}
          <p className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning ring-1 ring-warning/30">
            <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
            Sin conexión · reintentamos cuando vuelva la señal
          </p>
        </div>
      )}
    </div>
  );
}
