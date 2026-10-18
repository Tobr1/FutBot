import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Mismo aspecto que <Label> para cuando el control es un grupo (sin htmlFor). */
const GROUP_LABEL = "flex items-center gap-2 text-sm leading-none font-medium select-none";

/**
 * Etiqueta + control + ayuda/error, con atributos aria enlazados.
 *
 * - `control="input"` (por defecto): <Label htmlFor={id}> para un input.
 * - `control="group"`: la etiqueta es un <span id="{id}-label"> para grupos
 *   (ChoiceCards, radios); el grupo la referencia con `groupAria()`.
 *
 * El error no es una región viva: FormMessage es el único anuncio y
 * useFormErrorFocus lleva el foco al primer campo inválido.
 */
export function FormField({
  id,
  label,
  hint,
  errors,
  children,
  className,
  control = "input",
  aside,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  errors?: string[];
  children: ReactNode;
  className?: string;
  control?: "input" | "group";
  /** Contenido a la derecha de la etiqueta (p. ej. "¿La olvidaste?"). */
  aside?: ReactNode;
}) {
  const error = errors?.[0];
  const labelElement =
    control === "group" ? (
      <span id={`${id}-label`} className={GROUP_LABEL}>
        {label}
      </span>
    ) : (
      <Label htmlFor={id}>{label}</Label>
    );

  return (
    <div className={cn("grid gap-2", className)}>
      {aside ? (
        <div className="flex items-center justify-between gap-3">
          {labelElement}
          {aside}
        </div>
      ) : (
        labelElement
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Props aria para el control dentro de un FormField. */
export function fieldAria(id: string, errors?: string[], hint?: boolean) {
  const invalid = Boolean(errors?.length);
  return {
    id,
    name: id,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}

/** Props aria para un grupo (ChoiceCards) dentro de un FormField con control="group". */
export function groupAria(id: string, errors?: string[], hint?: boolean) {
  const invalid = Boolean(errors?.length);
  return {
    "aria-labelledby": `${id}-label`,
    "aria-describedby": invalid ? `${id}-error` : hint ? `${id}-hint` : undefined,
    "aria-invalid": invalid || undefined,
  };
}
