import { SkeletonTransition } from "@/components/motion/screen-transition";
import { ListGroupSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <PageHeaderSkeleton description={false} />
        <ListGroupSkeleton rows={1} />
        <ListGroupSkeleton rows={4} />
        <ListGroupSkeleton rows={3} trailing={false} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
