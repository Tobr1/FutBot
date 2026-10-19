import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { ListGroupSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamColumnsSkeleton } from "@/features/matches/components/match-skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <PageHeaderSkeleton />
        <Skeleton aria-hidden="true" className="h-20 rounded-xl" />
        <TeamColumnsSkeleton />
        <ListGroupSkeleton rows={4} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
