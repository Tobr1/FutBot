import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Igual que MatchCard: chip de fecha, dos líneas y badge. */
export function MatchCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("panel flex items-center gap-3 rounded-xl p-3", className)}>
      <Skeleton className="h-[4.25rem] w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16 shrink-0 self-start rounded-full" />
    </div>
  );
}

export function MatchListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-4">
      <Skeleton className="h-12 rounded-xl lg:max-w-sm pointer-coarse:h-[3.25rem]" />
      <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
        {Array.from({ length: count }, (_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Encabezado del detalle: fecha grande, cancha y chips. */
export function MatchHeroSkeleton() {
  return (
    <div aria-hidden="true" className="relative -mx-4 -mt-6 space-y-3 bg-surface-1/50 px-4 pt-5 pb-5 lg:mx-0 lg:mt-0 lg:rounded-2xl">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="h-4 w-40" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-7 w-14 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

/** Dos columnas de equipo. */
export function TeamColumnsSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-2">
      {[0, 1].map((col) => (
        <div key={col} className="panel space-y-2 rounded-xl p-3">
          <Skeleton className="h-4 w-16" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
