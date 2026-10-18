"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Alto de la barra (h-14) que tapa al título de la página al scrollear. */
const HEADER_PX = 56;

type TitleState = "idle" | "shown" | "hidden";

/**
 * Título de la StackHeader en mobile: aparece recién cuando el título de la
 * página (#page-title) queda debajo de la barra. Si la página no tiene ese
 * título, se muestra siempre.
 */
export function StackHeaderTitle({ title, targetId = "page-title" }: { title: string; targetId?: string }) {
  const [state, setState] = useState<TitleState>("idle");

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") {
      // Sin título en la página: no hay nada que observar. Se resuelve fuera
      // del cuerpo del efecto para no encadenar renders sincrónicos.
      const frame = requestAnimationFrame(() => setState("shown"));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Solo cuenta si el título quedó arriba (tapado por la barra), no si está más abajo.
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < HEADER_PX;
        setState(scrolledPast ? "shown" : "hidden");
      },
      { rootMargin: `-${HEADER_PX}px 0px 0px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const visible = state === "shown";
  return (
    <p
      aria-hidden={visible ? undefined : true}
      className={cn(
        "truncate text-[17px] leading-tight font-semibold transition-[opacity,translate] duration-200 ease-out-quint",
        visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
      )}
    >
      {title}
    </p>
  );
}
