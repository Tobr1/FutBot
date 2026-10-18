import type { Transition } from "motion/react";

/**
 * Presets de movimiento compartidos. CSS primero: motion solo para lo que CSS
 * no resuelve (drag, layoutId). Siempre `m.*` de "motion/react-m" (LazyMotion strict).
 */

export const SPRING = {
  /** Indicadores y pills que siguen a la selección (bottom nav). */
  snappy: { type: "spring", stiffness: 520, damping: 40, mass: 0.9 },
  /** Bottom sheets: vuelta a su lugar después de un drag. */
  sheet: { type: "spring", stiffness: 420, damping: 38 },
} as const satisfies Record<string, Transition>;

/** Duraciones en segundos (la API de motion usa segundos). */
export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

/** Curvas equivalentes a --ease-out-quint y --ease-in-out-quart. */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.76, 0, 0.24, 1],
} as const;

/** Umbrales para cerrar un bottom sheet arrastrándolo hacia abajo. */
export const SHEET_DISMISS = {
  /** Desplazamiento en px. */
  offset: 120,
  /** Velocidad en px/s. */
  velocity: 600,
} as const;
