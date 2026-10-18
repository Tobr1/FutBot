import { SkeletonTransition } from "@/components/motion/screen-transition";
import { CardGridSkeleton, FilterBarSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <PageHeaderSkeleton />
        <FilterBarSkeleton />
        <CardGridSkeleton count={6} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
