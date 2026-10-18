"use client";

import { useSearchParams } from "next/navigation";

/**
 * Campo oculto con el destino `?next=` de la URL. Vive aparte (y dentro de un
 * <Suspense>) para que el resto del formulario se prerenderice: solo este
 * pedacito depende de los parámetros de búsqueda.
 */
export function NextPathInput() {
  const next = useSearchParams().get("next") ?? "";
  return <input type="hidden" name="next" value={next} />;
}

/** Texto extra cuando el registro viene de una invitación. Envolver en <Suspense>. */
export function InvitationNextHint() {
  const next = useSearchParams().get("next") ?? "";
  if (!next.startsWith("/invitacion/")) return null;
  return <p className="text-sm text-muted-foreground">Cuando confirmes, te llevamos directo al grupo.</p>;
}
