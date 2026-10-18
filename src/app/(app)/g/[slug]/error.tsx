"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/**
 * Error dentro de una pantalla del grupo. error.js queda debajo del layout,
 * así que el encabezado y la barra inferior siguen montados y se puede
 * navegar a otra sección sin recargar.
 */
export default function GroupError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Lo lanzado desde un componente cliente puede no ser un Error.
    const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
    console.error(digest ? `[${digest}]` : "", error);
  }, [error]);

  return (
    <div className="py-4">
      <EmptyState
        icon={TriangleAlert}
        title="No pudimos cargar esto"
        description="Revisá tu conexión y probá de nuevo."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button type="button" size="lg" onClick={() => retry()}>
              Reintentar
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={routes.dashboard}>Ir a mis grupos</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
