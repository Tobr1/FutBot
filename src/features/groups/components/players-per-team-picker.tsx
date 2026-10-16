"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const COMMON_FORMATS = [5, 6, 7, 8, 9, 11];

/** Selector táctil del formato (jugadores por equipo) con opciones habituales. */
export function PlayersPerTeamPicker({ name, defaultValue = 5 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label="Jugadores por equipo" className="grid grid-cols-6 gap-2">
        {COMMON_FORMATS.map((format) => {
          const selected = value === format;
          return (
            <button
              key={format}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setValue(format)}
              className={cn(
                "flex h-14 flex-col items-center justify-center rounded-xl border font-display transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-surface/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span className="text-xl leading-none font-extrabold">F{format}</span>
              <span className="text-[10px] tracking-wider uppercase">{format}v{format}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
