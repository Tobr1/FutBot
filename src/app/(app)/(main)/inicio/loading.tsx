import { SkeletonTransition } from "@/components/motion/screen-transition";
import { PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton className="space-y-6">
        <PageHeaderSkeleton eyebrow description={false} />
        <div aria-hidden="true" className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
