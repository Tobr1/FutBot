import { CircleAlert, CircleCheck } from "lucide-react";
import type { Ref } from "react";
import type { ActionState } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/**
 * Mensaje general del formulario a partir del estado de la Server Action.
 * Es la única región viva del formulario y puede recibir foco
 * (useFormErrorFocus lo usa cuando no hay un campo puntual marcado).
 */
export function FormMessage({
  state,
  className,
  ref,
}: {
  state: ActionState;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  if (state.status === "idle" || (state.status === "success" && !state.message)) return null;
  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      ref={ref}
      data-form-message=""
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1 outline-none ring-inset",
        isError ? "bg-destructive/10 text-destructive ring-destructive/30" : "bg-success/10 text-success ring-success/30",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{state.message}</p>
    </div>
  );
}
