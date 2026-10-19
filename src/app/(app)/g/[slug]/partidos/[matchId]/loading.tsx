import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { ListGroupSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchHeroSkeleton, TeamColumnsSkeleton } from "@/features/matches/components/match-skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <MatchHeroSkeleton />
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-5 w-24" />
          <TeamColumnsSkeleton />
        </div>
        <ListGroupSkeleton rows={5} trailing={false} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
