import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <PageHeaderSkeleton />
        <div aria-hidden="true" className="flex gap-2">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-full" />
        </div>
        <div aria-hidden="true" className="max-w-2xl space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="list-group">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2.5 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                  {Array.from({ length: 10 }, (_, j) => (
                    <Skeleton key={j} className="h-11 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
