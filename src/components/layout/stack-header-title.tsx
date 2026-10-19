"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Alto de AppHeader + StackHeader si no se puede medir. */
const FALLBACK_PX = 104;

type TitleState = "idle" | "shown" | "hidden";

/**
 * Título de la StackHeader en mobile: aparece recién cuando el título de la
 * página (#page-title) queda debajo de la barra. Si la página no tiene ese
 * título, se muestra siempre.
 */
export function StackHeaderTitle({ title, targetId = "page-title" }: { title: string; targetId?: string }) {
  const [state, setState] = useState<TitleState>("idle");
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") {
      // Sin título en la página: no hay nada que observar. Se resuelve fuera
      // del cuerpo del efecto para no encadenar renders sincrónicos.
      const frame = requestAnimationFrame(() => setState("shown"));
      return () => cancelAnimationFrame(frame);
    }
    // Lo que tapa al título: todo el chrome hasta el borde inferior de esta barra.
    const bar = ref.current?.closest("[data-stack-header]");
    const coveredPx = Math.round(bar?.getBoundingClientRect().bottom ?? FALLBACK_PX) || FALLBACK_PX;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Solo cuenta si el título quedó arriba (tapado por la barra), no si está más abajo.
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < coveredPx;
        setState(scrolledPast ? "shown" : "hidden");
      },
      { rootMargin: `-${coveredPx}px 0px 0px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const visible = state === "shown";
  return (
    <p
      ref={ref}
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
