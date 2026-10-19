"use client";

import { Download } from "lucide-react";
import { ListRow } from "@/components/shared/list-group";
import { useInstallLauncher } from "./install-guide";
import { useInstallState } from "./install-store";

/**
 * Fila "Instalar app" para listas (Más, Perfil). Sigue disponible aunque se
 * haya cerrado la tarjeta de invitación; desaparece si la app ya está instalada.
 */
export function InstallAppRow() {
  const { guide } = useInstallState();
  const { start, sheet } = useInstallLauncher(guide);

  if (!guide) return null;

  return (
    <>
      <ListRow
        asChild
        leading={<Download className="size-5 text-primary" aria-hidden="true" />}
        title="Instalar app"
        subtitle={guide === "prompt" ? "Agregala a tu celu en un toque" : "Te mostramos cómo, paso a paso"}
        chevron
      >
        <button type="button" onClick={start} />
      </ListRow>
      {sheet}
    </>
  );
}
