"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

/** Si la app estuvo en segundo plano más de un minuto, se refrescan los datos al volver. */
export const RESUME_REFRESH_AFTER_MS = 60_000;

export function ResumeRefresh() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt: number | null = null;
    // Respaldo con reloj de pared: en iOS performance.now() puede no avanzar
    // mientras el teléfono duerme.
    let hiddenAtWall = 0;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = performance.now();
        hiddenAtWall = Date.now();
        return;
      }
      if (hiddenAt === null) return;
      const away = Math.max(performance.now() - hiddenAt, Date.now() - hiddenAtWall);
      hiddenAt = null;
      if (away > RESUME_REFRESH_AFTER_MS) startTransition(() => router.refresh());
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [router]);

  return null;
}
