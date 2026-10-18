import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * Campo "filled": fondo secondary/60 que se distingue del panel, borde input y
 * foco con anillo fino del token ring. text-base (16px) debajo de md evita el
 * zoom automático de iOS. Los campos de solo lectura se ven atenuados.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-secondary/60 px-3 py-1 text-base transition-[color,background-color,border-color,box-shadow] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring read-only:bg-transparent read-only:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/40 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
