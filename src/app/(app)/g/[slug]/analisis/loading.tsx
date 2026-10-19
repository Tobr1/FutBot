import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { ListGroupSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton className="space-y-6 lg:space-y-8">
        <StackHeaderSkeleton />
        <PageHeaderSkeleton action />
        <Skeleton aria-hidden="true" className="h-10 w-36 rounded-full" />
        <div aria-hidden="true" className="space-y-1">
          <div className="flex h-10 items-center">
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-64 rounded-xl sm:h-72" />
        </div>
        <div aria-hidden="true" className="space-y-1">
          <div className="flex h-10 items-center">
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <ListGroupSkeleton rows={4} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
