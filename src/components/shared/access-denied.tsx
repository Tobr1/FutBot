import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

/** Pantalla completa para rutas reservadas a administradores. */
export function AccessDenied({
  backHref,
  message = "Solo un administrador del grupo puede entrar acá.",
}: {
  backHref: string;
  message?: string;
}) {
  return (
    <EmptyState
      icon={Lock}
      tone="neutral"
      headingLevel="h1"
      title="Sin acceso"
      description={message}
      action={
        <Button variant="secondary" size="lg" asChild>
          <Link href={backHref} transitionTypes={["nav-back"]}>
            Volver
          </Link>
        </Button>
      }
    />
  );
}
