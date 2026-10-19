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
        <Skeleton aria-hidden="true" className="h-60 max-w-2xl rounded-2xl" />
        <ListGroupSkeleton rows={5} className="max-w-2xl" />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
