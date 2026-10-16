"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4">
      <EmptyState
        icon={TriangleAlert}
        title="Algo salió mal"
        description="No pudimos cargar esta pantalla. Probá de nuevo; si sigue fallando, avisale a un administrador."
        action={
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Reintentar
          </Button>
        }
        className="w-full max-w-md"
      />
    </div>
  );
}
