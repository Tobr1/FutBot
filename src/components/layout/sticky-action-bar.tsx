import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Barra de acciones pegada abajo (sobre la barra inferior del grupo, o al ras
 * del borde en el resto). Va DENTRO del <form> para que useFormStatus siga
 * funcionando. Con dos acciones: className="grid grid-cols-[1fr_auto] gap-2".
 * En escritorio queda estática al final del formulario.
 */
export function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-sticky-action-bar=""
      className={cn(
        "sticky bottom-[var(--chrome-bottom)] z-30 -mx-4 mt-2 border-t border-hairline bg-background/92 px-4 pt-3 pb-[var(--action-bar-pb)] backdrop-blur-md",
        "lg:static lg:mx-0 lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
