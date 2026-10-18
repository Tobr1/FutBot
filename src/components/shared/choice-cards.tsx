"use client";

import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  descriptionClassName?: string;
  disabled?: boolean;
  /** Por qué está deshabilitada; se ve como texto y se anuncia con aria-describedby. */
  disabledReason?: string;
  /** Color CSS de la barrita superior (p. ej. POSITION_COLOR_VAR[pos]). */
  accent?: string;
}

/**
 * Tarjetas de opción única: un radiogroup real (Radix) con foco itinerante
 * por flechas. Un <input type="hidden"> envía el valor con el formulario
 * (cadena vacía si no hay selección).
 *
 * Para enlazarlo con un FormField control="group": `{...groupAria(id, errors)}`
 * o las props ariaLabelledBy / ariaDescribedBy / invalid.
 */
export function ChoiceCards<T extends string>({
  name,
  value,
  onChange,
  options,
  columns,
  size = "md",
  clearLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  invalid,
  className,
  "aria-labelledby": ariaLabelledByAttr,
  "aria-describedby": ariaDescribedByAttr,
  "aria-invalid": ariaInvalidAttr,
}: {
  name: string;
  value: T | "";
  onChange: (value: T | "") => void;
  options: ChoiceOption<T>[];
  /** Clases de grilla, p. ej. "grid-cols-4" o "grid-cols-2 sm:grid-cols-3". */
  columns: string;
  size?: "md" | "lg";
  /** Texto del botón para quitar la selección (solo se ve con un valor elegido). */
  clearLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const baseId = useId();
  const isInvalid = invalid ?? ariaInvalidAttr ?? false;

  return (
    <div className={cn("grid gap-1", className)}>
      <input type="hidden" name={name} value={value} />
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={(next) => onChange(next as T)}
        loop
        aria-labelledby={ariaLabelledBy ?? ariaLabelledByAttr}
        aria-describedby={ariaDescribedBy ?? ariaDescribedByAttr}
        aria-invalid={isInvalid || undefined}
        className={cn("group/choices grid gap-2 rounded-xl", columns)}
      >
        {options.map((option) => {
          const reasonId = option.disabled && option.disabledReason ? `${baseId}-${option.value}-reason` : undefined;
          return (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              data-size={size}
              aria-describedby={reasonId}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-hairline bg-surface-1 px-2 py-2 text-center pressable data-[size=lg]:min-h-14",
                "data-[state=checked]:border-primary data-[state=checked]:bg-primary/15",
                "group-aria-invalid/choices:border-destructive/60",
                "focus-visible:outline-2 focus-visible:outline-ring",
                // Deshabilitada: se atenúa el contenido, no el motivo (tiene que leerse).
                "disabled:cursor-not-allowed disabled:*:not-data-[slot=reason]:opacity-40",
              )}
            >
              {option.accent && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 top-0 h-[3px] rounded-b-full"
                  style={{ background: option.accent }}
                />
              )}
              <span className="text-sm leading-tight font-semibold">{option.label}</span>
              {option.description && (
                <span className={cn("text-2xs leading-tight text-muted-foreground", option.descriptionClassName)}>
                  {option.description}
                </span>
              )}
              {reasonId && (
                <span id={reasonId} data-slot="reason" className="text-2xs leading-tight text-muted-foreground">
                  {option.disabledReason}
                </span>
              )}
              <RadioGroupPrimitive.Indicator className="absolute top-1.5 right-1.5 text-primary">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
              </RadioGroupPrimitive.Indicator>
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
      {clearLabel && value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="min-h-11 justify-self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
