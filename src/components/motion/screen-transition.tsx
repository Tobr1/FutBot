import { type ReactNode, ViewTransition } from "react";

/**
 * Transiciones de pantalla con React `<ViewTransition>` (CSS en globals.css).
 * Sirve en Server y Client Components; sin soporte del navegador, no anima.
 *
 * Cómo usarlas:
 * - `page.tsx`: envolvé todo el cuerpo de la página en `<ScreenTransition>`.
 *   Siempre en la página, nunca en un layout: los layouts persisten entre
 *   navegaciones y enter/exit no se disparan ahí.
 * - `loading.tsx`: envolvé el skeleton en `<SkeletonTransition>`. Entra con la
 *   misma dirección que la navegación y se desvanece rápido cuando llega el
 *   contenido, que entra con `screen-in` (fade + 8px hacia arriba).
 * - Links: `transitionTypes={['nav-forward']}` al profundizar (cards, filas,
 *   editar, agregar, filas del hub) y `['nav-back']` al volver. Los tabs de la
 *   barra inferior no llevan tipo.
 *
 * El back del navegador no lleva tipo, así que no desliza (solo `screen-in`).
 * Con movimiento reducido todo resuelve al instante.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "screen-in" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** Para el cuerpo de cada `loading.tsx`. Ver {@link ScreenTransition}. */
export function SkeletonTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit="skeleton-out"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
