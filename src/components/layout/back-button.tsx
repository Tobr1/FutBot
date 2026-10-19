"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { canGoBackInApp } from "@/lib/navigation/in-app-history";

/**
 * "Volver" que no apila pantallas: si hay una pantalla de la app detrás,
 * retrocede en el historial (como el gesto o el botón del sistema); si se
 * entró directo, reemplaza la entrada por la pantalla padre.
 * Es un <a> real a la pantalla padre: funciona sin JS y con "abrir en otra pestaña".
 */
export function BackButton({
  fallbackHref,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  fallbackHref: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (canGoBackInApp()) router.back();
    else router.replace(fallbackHref, { transitionTypes: ["nav-back"] });
  };

  return (
    <a href={fallbackHref} onClick={onClick} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  );
}
