"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SeasonOption {
  value: string;
  label: string;
}

/**
 * Filtros de temporada (y opcionalmente mínimo de partidos) que viven en la
 * URL, así se comparten por link y el botón atrás los respeta. Cada cambio
 * conserva el resto de los parámetros y vuelve a la primera página.
 */
export function StatsFilters({
  seasons,
  season,
  minMatches,
  minOptions,
  className,
}: {
  seasons: SeasonOption[];
  season: string;
  /** Sin valor: no se muestra el filtro de mínimo. */
  minMatches?: number;
  minOptions?: number[];
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} aria-busy={isPending || undefined}>
      <Select value={season} onValueChange={(v) => update("temporada", v)}>
        <SelectTrigger aria-label="Temporada" className="min-w-36 rounded-full px-3.5 text-sm font-medium data-[size=default]:h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {minMatches !== undefined && minOptions && (
        <Select value={String(minMatches)} onValueChange={(v) => update("min", v)}>
          <SelectTrigger aria-label="Mínimo de partidos" className="rounded-full px-3.5 text-sm font-medium data-[size=default]:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {minOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Mín. {n} {n === 1 ? "partido" : "partidos"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isPending && <Loader2 className="size-4 text-muted-foreground motion-safe:animate-spin" aria-label="Actualizando" />}
    </div>
  );
}
