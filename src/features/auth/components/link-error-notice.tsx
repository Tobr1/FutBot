"use client";

import { useSearchParams } from "next/navigation";
import { FormMessage } from "@/components/shared/form-message";
import { errorState } from "@/lib/action-result";

/**
 * Aviso de "link vencido" cuando el callback de email vuelve con ?error=link.
 * Solo se muestra mientras el formulario no tiene otro mensaje (`show`).
 */
export function LinkErrorNotice({ show }: { show: boolean }) {
  const linkFailed = useSearchParams().get("error") === "link";
  if (!show || !linkFailed) return null;
  return <FormMessage state={errorState("El link venció o ya se usó. Pedí uno nuevo o ingresá con tu contraseña.")} />;
}
