import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { HeroSkeleton, ListGroupSkeleton, ScreenSkeleton, StatStripSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <HeroSkeleton variant="player" />
        <div aria-hidden="true" className="space-y-4">
          <StatStripSkeleton />
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-11 rounded-lg lg:w-36" />
        </div>
        <div aria-hidden="true" className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-64 rounded-xl sm:h-72" />
        </div>
        <ListGroupSkeleton rows={3} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
