import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/** Mensaje general del formulario a partir del estado de la Server Action. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || (state.status === "success" && !state.message)) return null;
  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        isError ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{state.message}</p>
    </div>
  );
}
