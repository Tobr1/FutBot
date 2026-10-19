import type { ReactNode } from "react";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { PageHeader } from "@/components/shared/page-header";
import { routes } from "@/lib/routes";

/**
 * Pantalla apilada de "Más": barra con Volver (44px) y encabezado compacto.
 * Las sub-páginas de ajustes no repiten el nombre del grupo (ya está arriba).
 */
export function SettingsShell({
  slug,
  title,
  description,
  backHref,
  backLabel = "Más",
  actions,
  children,
}: {
  slug: string;
  title: string;
  description?: ReactNode;
  /** Pantalla padre (por defecto, el hub "Más"). */
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScreenTransition>
      <div className="space-y-6">
        <StackHeader backHref={backHref ?? routes.groupSettings(slug)} backLabel={backLabel} title={title} />
        <PageHeader title={title} description={description} actions={actions} />
        {children}
      </div>
    </ScreenTransition>
  );
}
