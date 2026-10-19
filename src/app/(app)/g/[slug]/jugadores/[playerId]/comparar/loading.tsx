import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { ListGroupSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <PageHeaderSkeleton />
        <div aria-hidden="true" className="max-w-2xl space-y-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-11 rounded-lg lg:w-44" />
        </div>
        <ListGroupSkeleton rows={6} avatar={false} className="max-w-2xl" />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
