import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { FormSkeleton, ListGroupSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <PageHeaderSkeleton />
        <FormSkeleton fields={3} />
        <ListGroupSkeleton rows={5} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
