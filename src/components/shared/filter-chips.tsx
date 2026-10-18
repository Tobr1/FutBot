"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Color CSS del puntito (p. ej. POSITION_COLOR_VAR[pos]). */
  dot?: string;
}

/**
 * Chips de filtro de selección única en una fila con scroll horizontal
 * (sangra hasta el borde de la pantalla). Radix ToggleGroup: flechas para
 * moverse, Espacio/Enter para elegir. Siempre hay un chip activo.
 */
export function FilterChips<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: FilterChipOption<T>[];
  /** Nombre accesible del grupo, p. ej. "Filtrar por posición". */
  label: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Al montar, centra el chip activo dentro de la fila. Se calcula a mano
  // (no scrollIntoView) para no mover el scroll vertical de la página.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const active = root?.querySelector<HTMLElement>('[data-state="on"]');
    if (!root || !active) return;
    const rootRect = root.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const left = root.scrollLeft + (activeRect.left - rootRect.left) - (rootRect.width - activeRect.width) / 2;
    root.scrollLeft = Math.max(0, left);
  }, []);

  return (
    <ToggleGroupPrimitive.Root
      ref={rootRef}
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 py-1 no-scrollbar scroll-fade-x snap-x scroll-px-4 overscroll-x-contain",
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="inline-flex h-10 shrink-0 snap-start items-center gap-1.5 rounded-full border border-hairline px-3.5 text-sm font-medium whitespace-nowrap text-muted-foreground pressable focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[state=on]:border-primary data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
        >
          {option.dot && (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: option.dot }} />
          )}
          {option.label}
          {option.count !== undefined && <span className="text-muted-foreground tabular">{option.count}</span>}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
