import { SkeletonTransition } from "@/components/motion/screen-transition";
import { ListGroupSkeleton, PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const CHIP_WIDTHS = ["w-32", "w-28", "w-28", "w-32", "w-28", "w-28"];

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton className="space-y-6">
        <PageHeaderSkeleton action />
        <div aria-hidden="true" className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
        <div aria-hidden="true" className="space-y-4">
          <div className="-mx-4 flex gap-2 overflow-hidden px-4 py-1">
            {CHIP_WIDTHS.map((width, i) => (
              <Skeleton key={i} className={`h-10 shrink-0 rounded-full ${width}`} />
            ))}
          </div>
          <Skeleton className="h-4 w-56" />
          <div className="grid grid-cols-3 items-end gap-2 px-1 pt-2">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
        <ListGroupSkeleton rows={4} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
