import { cn } from "@/lib/utils";

/**
 * Isotipo: círculo central de una cancha dentro de un escudo redondeado.
 * El degradado va en CSS (no en <defs>) para evitar ids SVG duplicados
 * cuando hay más de un logo en la página.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center rounded-[30%] bg-gradient-to-br from-[oklch(0.7_0.18_245)] to-[oklch(0.55_0.22_265)] shadow-[0_6px_18px_-8px_oklch(0.62_0.2_258)]",
        className,
      )}
    >
      <svg viewBox="0 0 40 40" className="size-full">
        <path d="M20 3v34" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
        <circle cx="20" cy="20" r="8.5" fill="none" stroke="white" strokeWidth="2.4" />
        <circle cx="20" cy="20" r="2.4" fill="white" />
        <path d="M1 14h5.5v12H1" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
        <path d="M39 14h-5.5v12H39" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-xl leading-none font-extrabold tracking-wide uppercase">
          Futbol<span className="text-primary">eros</span>
        </span>
      )}
    </span>
  );
}
