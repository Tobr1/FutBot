import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={className ?? "grid gap-3 md:grid-cols-2"} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="grid max-w-xl gap-5" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11" />
        </div>
      ))}
      <Skeleton className="h-10 w-36" />
    </div>
  );
}

/** Esqueleto genérico de página: encabezado + contenido. */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "cards" | "form" }) {
  return (
    <div className="space-y-8" role="status" aria-label="Cargando">
      <PageHeaderSkeleton />
      {variant === "cards" ? <CardGridSkeleton /> : variant === "form" ? <FormSkeleton /> : <ListSkeleton />}
    </div>
  );
}
