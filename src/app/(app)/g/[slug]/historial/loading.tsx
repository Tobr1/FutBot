import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchListSkeleton } from "@/features/matches/components/match-skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <PageHeaderSkeleton />
        <Skeleton aria-hidden="true" className="h-10 w-48 rounded-full" />
        <div aria-hidden="true" className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <MatchListSkeleton />
        </div>
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
