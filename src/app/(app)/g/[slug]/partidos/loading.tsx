import { SkeletonTransition } from "@/components/motion/screen-transition";
import { PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <PageHeaderSkeleton />
        <Skeleton aria-hidden="true" className="h-64 rounded-2xl" />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
