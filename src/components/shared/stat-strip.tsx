import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "success" | "gold" | "primary" | "danger";

export interface StatStripItem {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  /** Lectura completa para lectores de pantalla cuando el label es una sigla ("PJ"). */
  srLabel?: string;
}

const TONES: Record<StatTone, string> = {
  default: "text-foreground",
  success: "text-success",
  gold: "text-gold",
  primary: "text-primary",
  danger: "text-destructive",
};

// Sin cn(): `text-stat` es un tamaño propio y el merge lo confundiría con un color.
const VALUE = "font-display text-stat font-extrabold tabular";

/** Tira de estadísticas en celdas iguales, separadas por filetes. */
export function StatStrip({ items, className }: { items: StatStripItem[]; className?: string }) {
  return (
    <dl className={cn("panel grid grid-flow-col auto-cols-fr divide-x divide-hairline rounded-xl py-3 text-center", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col-reverse items-center px-1">
          <dt className="mt-1 max-w-full truncate text-2xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {item.srLabel ? (
              <>
                <span aria-hidden="true">{item.label}</span>
                <span className="sr-only">{item.srLabel}</span>
              </>
            ) : (
              item.label
            )}
          </dt>
          <dd className={`${VALUE} ${TONES[item.tone ?? "default"]}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
