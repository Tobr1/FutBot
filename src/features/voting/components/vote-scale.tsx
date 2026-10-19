"use client";

import { type KeyboardEvent, useRef } from "react";
import { SCORES } from "@/domain/voting/voting";
import { cn } from "@/lib/utils";

/**
 * Escala rápida 1-10: un radiogroup real con foco itinerante (flechas,
 * Inicio/Fin). Cinco por fila en el teléfono (cada botón mide 44 px de alto
 * y ~58 px de ancho) y los diez en una fila desde sm.
 */
export function VoteScale({
  value,
  onChange,
  label,
  disabled = false,
  className,
}: {
  value: number | null | undefined;
  onChange: (score: number) => void;
  /** Nombre accesible, p. ej. "Calificación de Brito". */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusIndex = value ? SCORES.indexOf(value) : 0;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = SCORES.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(SCORES[next]);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} className={cn("grid grid-cols-5 gap-1.5 sm:grid-cols-10", className)}>
      {SCORES.map((score, index) => {
        const checked = value === score;
        return (
          <button
            key={score}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === Math.max(0, focusIndex) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(score)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "pressable h-11 min-w-0 rounded-lg font-display text-xl leading-none font-extrabold tabular ring-1 ring-inset",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
              checked
                ? "bg-primary-solid text-primary-foreground shadow-glow ring-primary"
                : "bg-surface-2 text-foreground/85 ring-hairline [@media(hover:hover)]:hover:bg-surface-3",
            )}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}
