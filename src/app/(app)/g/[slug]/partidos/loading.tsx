import { SkeletonTransition } from "@/components/motion/screen-transition";
import { PageHeaderSkeleton, ScreenSkeleton } from "@/components/shared/skeletons";
import { MatchListSkeleton } from "@/features/matches/components/match-skeletons";

export default function Loading() {
  return (
    <SkeletonTransition>
      <ScreenSkeleton>
        <PageHeaderSkeleton />
        <MatchListSkeleton />
      </ScreenSkeleton>
    </SkeletonTransition>
  );
}
