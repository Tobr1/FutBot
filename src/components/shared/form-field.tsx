import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Etiqueta + control + ayuda/error, con atributos aria enlazados. */
export function FormField({
  id,
  label,
  hint,
  errors,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  errors?: string[];
  children: ReactNode;
  className?: string;
}) {
  const error = errors?.[0];
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive" role="alert">
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
