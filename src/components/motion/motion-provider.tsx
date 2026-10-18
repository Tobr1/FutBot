"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

/**
 * Carga diferida de motion. `strict` hace que usar `motion.*` tire error:
 * usá siempre `import * as m from "motion/react-m"`. Con movimiento reducido
 * del sistema, motion anula transformaciones y deja solo opacidad.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
