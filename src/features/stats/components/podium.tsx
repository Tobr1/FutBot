import Link from "next/link";
import type { CSSProperties } from "react";
import { LinkPending } from "@/components/shared/link-pending";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

export interface PodiumEntry {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  display: string;
  href: string;
}

const PLACES = {
  1: { text: "text-medal-1", ring: "ring-medal-1/60", block: "h-24 bg-medal-1/16 ring-medal-1/35", avatar: "lg" as const, order: "order-2", delay: 2 },
  2: { text: "text-medal-2", ring: "ring-medal-2/50", block: "h-16 bg-medal-2/12 ring-medal-2/30", avatar: "md" as const, order: "order-1", delay: 1 },
  3: { text: "text-medal-3", ring: "ring-medal-3/50", block: "h-12 bg-medal-3/14 ring-medal-3/30", avatar: "md" as const, order: "order-3", delay: 3 },
};

/**
 * Podio de los tres primeros (2 · 1 · 3) con los colores de medalla. Sube
 * escalonado con animate-rise (se anula con movimiento reducido).
 */
export function Podium({ entries, unit, className }: { entries: PodiumEntry[]; unit?: string; className?: string }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;
  // Orden del DOM 1-2-3 (lectores de pantalla); visualmente 2 · 1 · 3.
  return (
    <ol aria-label="Podio" className={cn("grid grid-cols-3 items-end gap-2", className)}>
      {top.map((entry, index) => {
        const place = (index + 1) as 1 | 2 | 3;
        const style = PLACES[place];
        return (
          <li
            key={entry.playerId}
            className={cn("animate-rise [animation-delay:calc(var(--i)*70ms)]", style.order, top.length === 1 && "col-start-2")}
            style={{ "--i": style.delay } as CSSProperties}
          >
            <Link
              href={entry.href}
              transitionTypes={["nav-forward"]}
              className="pressable relative flex flex-col items-center gap-1.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <UserAvatar name={entry.nickname} src={entry.avatarUrl} size={style.avatar} className={cn("ring-2", style.ring)} />
              <span className="w-full truncate text-center text-sm font-semibold">{entry.nickname}</span>
              <span className={cn("font-display text-stat leading-none font-extrabold tabular", style.text)}>
                {entry.display}
                {unit && <span className="sr-only"> {unit}</span>}
              </span>
              <span
                className={cn(
                  "mt-1 grid w-full place-items-start justify-center rounded-t-lg pt-1.5 ring-1 ring-inset",
                  style.block,
                )}
              >
                <span className={cn("font-display text-2xl leading-none font-extrabold", style.text)}>
                  <span className="sr-only">Puesto </span>
                  {place}
                </span>
              </span>
              <LinkPending />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
