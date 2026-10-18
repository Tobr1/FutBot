import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { FormSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton className="mx-auto max-w-2xl">
        <StackHeaderSkeleton />
        <div aria-hidden="true" className="flex flex-col items-center gap-3 pt-2 lg:flex-row lg:gap-5 lg:pt-0">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-col items-center gap-2 lg:items-start">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <FormSkeleton fields={1} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
