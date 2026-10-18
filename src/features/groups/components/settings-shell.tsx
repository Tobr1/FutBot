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
  focusFlow = false,
  actions,
  children,
}: {
  slug: string;
  title: string;
  description?: ReactNode;
  /** Formularios: oculta la barra inferior para que la barra de acciones quede al ras. */
  focusFlow?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScreenTransition>
      <div className="space-y-6">
        <StackHeader backHref={routes.groupSettings(slug)} backLabel="Más" title={title} focusFlow={focusFlow} />
        <PageHeader title={title} description={description} actions={actions} />
        {children}
      </div>
    </ScreenTransition>
  );
}
