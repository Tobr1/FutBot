import { CalendarX2 } from "lucide-react";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { BackToMatchesLink } from "@/features/matches/components/back-to-matches-link";

export default function MatchNotFound() {
  return (
    <EmptyState
      icon={CalendarX2}
      tone="neutral"
      headingLevel="h1"
      title="No encontramos ese partido"
      description="Puede que lo hayan eliminado."
      action={
        <Suspense fallback={null}>
          <BackToMatchesLink />
        </Suspense>
      }
    />
  );
}
