import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Esqueletos con la misma forma que los bloques reales, para que el paso de
 * loading.tsx al contenido no salte. Todos son decorativos (aria-hidden);
 * el anuncio "Cargando…" lo pone ScreenSkeleton una sola vez por pantalla.
 * Anchos deterministas (sin Math.random) para que el prerender sea estable.
 */

/** Contenedor de pantalla de carga: región de estado + espaciado de página. */
export function ScreenSkeleton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("space-y-6 lg:space-y-8", className)}>
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}

/** Igual que PageHeader: una fila con título (y acción opcional). */
export function PageHeaderSkeleton({
  eyebrow = false,
  description = true,
  action = false,
}: {
  eyebrow?: boolean;
  description?: boolean;
  action?: boolean;
} = {}) {
  return (
    <div className="flex items-end justify-between gap-3" aria-hidden="true">
      <div className="min-w-0 flex-1 space-y-2">
        {eyebrow && <Skeleton className="h-3 w-20" />}
        <Skeleton className="h-8 w-48 max-w-full sm:h-9" />
        {description && <Skeleton className="h-4 w-72 max-w-full" />}
      </div>
      {action && <Skeleton className="size-10 shrink-0 rounded-lg lg:w-32" />}
    </div>
  );
}

/** Banda superior a todo el ancho: escudo del grupo o carta del jugador. */
export function HeroSkeleton({ variant, className }: { variant: "group" | "player"; className?: string }) {
  if (variant === "player") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "relative -mx-4 -mt-6 overflow-hidden bg-surface-1/50 px-4 pt-5 pb-6 lg:mx-0 lg:mt-0 lg:rounded-2xl",
          className,
        )}
      >
        <div className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-4 md:grid-cols-[240px_1fr]">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <div className="min-w-0 space-y-2.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-40 max-w-full" />
            <Skeleton className="h-4 w-28 max-w-full" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative -mx-4 -mt-4 min-h-48 overflow-hidden bg-surface-1/50 px-4 pt-5 pb-5 lg:mx-0 lg:mt-0 lg:rounded-2xl",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-16 shrink-0 rounded-[28%_28%_46%_46%]" />
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-3 h-8 w-56 max-w-full" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

const ROW_TITLE_WIDTHS = ["w-2/5", "w-1/2", "w-1/3", "w-3/5", "w-2/5", "w-1/2"];
const ROW_SUBTITLE_WIDTHS = ["w-1/4", "w-1/3", "w-1/5", "w-1/4", "w-2/5", "w-1/5"];

/** Igual que ListGroup con filas de 56 px (avatar, dos líneas, valor). */
export function ListGroupSkeleton({
  rows = 5,
  avatar = true,
  trailing = true,
  className,
}: {
  rows?: number;
  avatar?: boolean;
  trailing?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("list-group", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
          {avatar && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className={cn("h-3.5", ROW_TITLE_WIDTHS[i % ROW_TITLE_WIDTHS.length])} />
            <Skeleton className={cn("h-3", ROW_SUBTITLE_WIDTHS[i % ROW_SUBTITLE_WIDTHS.length])} />
          </div>
          {trailing && <Skeleton className="h-7 w-10 shrink-0 rounded-lg" />}
        </div>
      ))}
    </div>
  );
}

/** Igual que StatStrip: celdas con número y sigla. */
export function StatStripSkeleton({ cells = 5, className }: { cells?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("panel grid grid-flow-col auto-cols-fr divide-x divide-hairline rounded-xl py-3", className)}
    >
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className="flex flex-col items-center px-1">
          <Skeleton className="h-7 w-9" />
          <div className="mt-1 flex h-4 items-center">
            <Skeleton className="h-2.5 w-10 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const CHIP_WIDTHS = ["w-16", "w-20", "w-[4.5rem]", "w-20", "w-[4.5rem]", "w-24"];

/** Igual que la barra de filtros del plantel: búsqueda, botones y chips. */
export function FilterBarSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("-mx-4 space-y-2 px-4 py-2", className)}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 min-w-0 flex-1 rounded-lg" />
        <Skeleton className="size-11 shrink-0 rounded-lg" />
        <Skeleton className="h-11 w-[5.5rem] shrink-0 rounded-lg" />
      </div>
      <div className="-mx-4 flex gap-2 overflow-hidden px-4 py-1">
        {CHIP_WIDTHS.map((width, i) => (
          <Skeleton key={i} className={cn("h-10 shrink-0 rounded-full", width)} />
        ))}
      </div>
    </div>
  );
}

/** Lista genérica de bloques (compatibilidad; preferir ListGroupSkeleton). */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={className ?? "grid gap-3 md:grid-cols-2"} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

/** Igual que PlayerCard: carta 3:4 con valoración, avatar, nombre y stats. */
export function CardGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="@container relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-1/50 ring-1 ring-hairline">
          <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] p-[7cqw]">
            <div className="flex items-start justify-between">
              <div className="space-y-[2.5cqw]">
                <Skeleton className="h-[19cqw] w-[26cqw] rounded-[2cqw]" />
                <Skeleton className="h-5 w-[20cqw] rounded" />
              </div>
              <Skeleton className="h-[7cqw] w-[30cqw] rounded-[2cqw]" />
            </div>
            <div className="flex min-h-0 items-center justify-center">
              <Skeleton className="size-[38cqw] max-h-24 max-w-24 rounded-full" />
            </div>
            <div className="space-y-[3cqw]">
              <Skeleton className="mx-auto h-[11.5cqw] w-3/4 rounded-[2cqw]" />
              <Skeleton className="h-[21cqw] w-full rounded-[3cqw]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Formulario: etiquetas, campos de 44 px y la barra del botón principal. */
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("grid max-w-xl gap-5", className)} aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl lg:w-40" />
    </div>
  );
}

/** Esqueleto genérico de página: encabezado + contenido (compatibilidad). */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "cards" | "form" }) {
  return (
    <ScreenSkeleton>
      <PageHeaderSkeleton />
      {variant === "cards" ? <CardGridSkeleton /> : variant === "form" ? <FormSkeleton /> : <ListGroupSkeleton />}
    </ScreenSkeleton>
  );
}
