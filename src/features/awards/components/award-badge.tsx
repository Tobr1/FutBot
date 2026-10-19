import {
  BrickWall,
  CalendarCheck,
  Crown,
  Flame,
  Footprints,
  Goal,
  Handshake,
  type LucideIcon,
  Medal,
  ShieldCheck,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import type { AwardIcon, AwardTier } from "@/domain/awards";
import { cn } from "@/lib/utils";

export const AWARD_ICONS: Record<AwardIcon, LucideIcon> = {
  BrickWall,
  CalendarCheck,
  Crown,
  Flame,
  Footprints,
  Goal,
  Handshake,
  Medal,
  ShieldCheck,
  Star,
  Trophy,
  Zap,
};

/** Tier → tokens de medalla (oro = dorado de premios, plata y bronce). */
export const TIER_TONE: Record<AwardTier, { tile: string; text: string; bar: string }> = {
  gold: { tile: "bg-medal-1/14 text-medal-1 ring-medal-1/35", text: "text-medal-1", bar: "bg-medal-1" },
  silver: { tile: "bg-medal-2/12 text-medal-2 ring-medal-2/30", text: "text-medal-2", bar: "bg-medal-2" },
  bronze: { tile: "bg-medal-3/14 text-medal-3 ring-medal-3/35", text: "text-medal-3", bar: "bg-medal-3" },
};

const SIZES = {
  sm: { tile: "size-9 rounded-lg", icon: "size-[18px]" },
  md: { tile: "size-11 rounded-xl", icon: "size-[22px]" },
  lg: { tile: "size-14 rounded-2xl", icon: "size-7" },
} as const;

/** Ícono del logro en un tile con el color de su tier (decorativo). `locked` lo apaga (logro por ganar). */
export function AwardBadge({
  icon,
  tier,
  size = "md",
  locked = false,
  className,
}: {
  icon: AwardIcon;
  tier: AwardTier;
  size?: keyof typeof SIZES;
  locked?: boolean;
  className?: string;
}) {
  const Icon = AWARD_ICONS[icon];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center ring-1 ring-inset",
        SIZES[size].tile,
        locked ? "bg-surface-3 text-muted-foreground ring-hairline" : TIER_TONE[tier].tile,
        className,
      )}
    >
      <Icon className={cn(SIZES[size].icon, tier === "gold" && !locked && icon === "Star" && "fill-current")} aria-hidden="true" />
    </span>
  );
}
