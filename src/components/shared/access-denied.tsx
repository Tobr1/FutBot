import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function AccessDenied({ backHref, message = "Solo un administrador del grupo puede entrar acá." }: { backHref: string; message?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="Sin acceso"
      description={message}
      action={
        <Button variant="secondary" asChild>
          <Link href={backHref}>Volver</Link>
        </Button>
      }
    />
  );
}
