import { SkeletonTransition } from "@/components/motion/screen-transition";
import { HeroSkeleton, ListGroupSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton className="space-y-4 lg:space-y-6">
        <HeroSkeleton variant="group" />
        <Skeleton aria-hidden="true" className="h-20 rounded-xl" />
        <Skeleton aria-hidden="true" className="h-[86px] rounded-xl" />
        <div aria-hidden="true">
          <div className="flex h-10 items-center">
            <Skeleton className="h-4 w-32" />
          </div>
          <ListGroupSkeleton rows={5} />
        </div>
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
