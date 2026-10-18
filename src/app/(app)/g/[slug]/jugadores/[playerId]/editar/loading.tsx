import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { FormSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <PageHeaderSkeleton description={false} />
        <FormSkeleton fields={5} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
