"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Velo sutil que aparece sobre un <Link> mientras la navegación está
 * pendiente (solo si tarda más de 100 ms). Renderizar DENTRO de un <Link>
 * cuyo elemento tenga position: relative.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      data-pending={pending}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] bg-white/6 opacity-0 transition-opacity data-[pending=true]:opacity-100 data-[pending=true]:delay-100",
        className,
      )}
    />
  );
}
