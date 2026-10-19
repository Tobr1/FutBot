import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";
import { StackHeaderTitle } from "./stack-header-title";

/*
 * Barra de las pantallas "apiladas" (detalle, formularios, ajustes).
 * En mobile queda pegada debajo del AppHeader (que nunca se oculta) con el
 * botón Volver, que retrocede en el historial en vez de apilar pantallas.
 * En escritorio es una miga de pan estática y el título lo pone la página.
 */
const BAR_CLASS = cn(
  "app-chrome sticky top-[calc(var(--header-h)+var(--safe-top))] z-30 -mx-4 -mt-4 grid h-[var(--stack-h)] grid-cols-[2.75rem_1fr_auto] items-center gap-1 border-b border-hairline bg-background/90 pr-2 pl-1 backdrop-blur-md",
  "lg:static lg:mx-0 lg:mt-0 lg:flex lg:h-auto lg:min-h-11 lg:justify-between lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
);

export function StackHeader({
  backHref,
  backLabel,
  title,
  actions,
  className,
}: {
  backHref: string;
  /** Pantalla a la que vuelve ("Plantel", "Más"…). */
  backLabel: string;
  /** Título corto que aparece en la barra al scrollear (mobile). */
  title?: string;
  /** Botones de ícono (size="icon") alineados a la derecha. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      data-stack-header=""
      style={{ viewTransitionName: "stack-header" }}
      className={cn(BAR_CLASS, className)}
    >
      <BackButton
        fallbackHref={backHref}
        aria-label={`Volver (${backLabel})`}
        className={cn(
          "pressable grid size-11 place-items-center rounded-full text-foreground",
          "lg:-ml-1 lg:inline-flex lg:size-auto lg:min-h-11 lg:items-center lg:gap-1 lg:rounded-lg lg:px-1 lg:text-sm lg:font-medium lg:text-muted-foreground lg:hover:text-foreground",
        )}
      >
        <ChevronLeft className="size-6 lg:size-4" aria-hidden="true" />
        <span className="hidden truncate lg:inline">{backLabel}</span>
      </BackButton>
      <div className="min-w-0 lg:hidden">{title ? <StackHeaderTitle title={title} /> : null}</div>
      <div className="flex items-center justify-end gap-1">{actions}</div>
    </header>
  );
}

/** Misma caja que StackHeader, para los loading.tsx (sin links). */
export function StackHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-stack-header=""
      aria-hidden="true"
      style={{ viewTransitionName: "stack-header" }}
      className={cn(BAR_CLASS, className)}
    >
      <span className="grid size-11 place-items-center lg:hidden">
        <Skeleton className="size-7 rounded-full" />
      </span>
      <span className="hidden min-h-11 items-center lg:flex">
        <Skeleton className="h-4 w-24" />
      </span>
      <div className="min-w-0 lg:hidden">
        <Skeleton className="h-4 w-36 max-w-full" />
      </div>
      <div />
    </div>
  );
}
