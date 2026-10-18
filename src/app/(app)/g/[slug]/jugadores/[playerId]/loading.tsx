import { StackHeaderSkeleton } from "@/components/layout/stack-header";
import { SkeletonTransition } from "@/components/motion/screen-transition";
import { HeroSkeleton, ListGroupSkeleton, ScreenSkeleton, StatStripSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <StackHeaderSkeleton />
        <HeroSkeleton variant="player" />
        <StatStripSkeleton />
        <ListGroupSkeleton rows={3} avatar={false} />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
