import { UserX } from "lucide-react";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { BackToPlantelLink } from "@/features/players/components/back-to-plantel-link";

export default function PlayerNotFound() {
  return (
    <EmptyState
      icon={UserX}
      tone="neutral"
      headingLevel="h1"
      title="Ese jugador no está en el plantel"
      description="Puede que lo hayan eliminado."
      action={
        <Suspense fallback={null}>
          <BackToPlantelLink />
        </Suspense>
      }
    />
  );
}
