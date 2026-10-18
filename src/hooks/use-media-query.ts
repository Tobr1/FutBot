"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Breakpoint `lg` de Tailwind: a partir de acá el chrome es de escritorio. */
export const DESKTOP_QUERY = "(min-width: 64rem)";
/** Breakpoint `sm` de Tailwind: a partir de acá las hojas se centran. */
export const SM_UP_QUERY = "(min-width: 40rem)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function canMatchMedia() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/**
 * Suscripción a un media query sin efectos ni estado propio.
 * En el servidor (y durante la hidratación) devuelve `serverValue`, así el
 * HTML prerenderizado coincide siempre con el primer render del cliente.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => (canMatchMedia() ? window.matchMedia(query).matches : serverValue), [query, serverValue]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** true desde 64rem (1024px): menús como dropdown, pestañas arriba. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}

/** true desde 40rem (640px): hojas centradas y sin arrastre. */
export function useIsSmUp(): boolean {
  return useMediaQuery(SM_UP_QUERY);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
