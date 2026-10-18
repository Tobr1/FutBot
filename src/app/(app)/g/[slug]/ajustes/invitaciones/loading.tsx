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
        {/* Panel "Link del grupo": título, chip del link y botón principal. */}
        <div aria-hidden="true" className="panel space-y-3 rounded-xl p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <ListGroupSkeleton rows={3} avatar={false} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
