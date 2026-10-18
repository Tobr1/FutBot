"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Desde un Client Component puede llegar cualquier valor, no siempre un Error.
    if (error instanceof Error) {
      console.error(error);
    } else {
      console.error("Error inesperado:", error);
    }
  }, [error]);

  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center px-4 pt-[max(2rem,var(--safe-top))] pb-[max(2rem,var(--safe-bottom))] outline-none"
    >
      <EmptyState
        icon={TriangleAlert}
        title="Algo salió mal"
        description="No pudimos cargar esta pantalla. Probá de nuevo; si sigue fallando, avisale a un administrador."
        action={
          <Button onClick={() => retry()}>
            <RotateCcw aria-hidden="true" />
            Reintentar
          </Button>
        }
        className="w-full max-w-md"
      />
    </main>
  );
}
