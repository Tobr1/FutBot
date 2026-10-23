import type { ReactNode } from "react";
import { Clock, IdCard, Lock, Star, Vote } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkPending } from "@/components/shared/link-pending";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { formatDecimal } from "@/domain/rating";
import { closesInLabel, closesSoon, progressPercent, type VoteSide, votersLabel } from "@/domain/voting/voting";
import { cn } from "@/lib/utils";

const SIDE_DOT: Record<VoteSide, string> = { a: "bg-team-a", b: "bg-team-b" };

/** Barra fina de progreso (decorativa: el texto ya dice los números). */
export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      <div className="h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${percent / 100})` }} />
    </div>
  );
}

export type MyVoteStatus =
  | { kind: "can-vote"; rated: number; total: number }
  | { kind: "no-player"; claimHref: string }
  | { kind: "not-participant" };

/** Votación abierta: cuánto falta, cuántos votaron (sin nombres) y el botón para votar. */
export function OpenVotingCard({
  closesAt,
  nowMs,
  voters,
  eligible,
  voteHref,
  me,
  adminActions,
}: {
  closesAt: string;
  nowMs: number;
  voters: number;
  eligible: number;
  voteHref: string;
  me: MyVoteStatus;
  /** Avisar por WhatsApp / cerrar antes de tiempo (solo admin). */
  adminActions?: ReactNode;
}) {
  const soon = closesSoon(closesAt, nowMs);
  return (
    <div className="panel space-y-4 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
          <Vote className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Votación abierta</p>
          <p className={cn("flex items-center gap-1.5 text-sm", soon ? "font-medium text-warning" : "text-muted-foreground")}>
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            {closesInLabel(closesAt, nowMs)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground tabular">{votersLabel(voters, eligible)}</p>
        <ProgressBar percent={progressPercent(voters, eligible)} />
      </div>

      {me.kind === "can-vote" && (
        <Button asChild size="lg" className="w-full lg:w-auto">
          <Link href={voteHref} transitionTypes={["nav-forward"]}>
            <Vote aria-hidden="true" />
            {me.rated === 0 ? "Votar" : me.rated < me.total ? `Seguir votando (${me.rated} de ${me.total})` : "Editar mis votos"}
          </Link>
        </Button>
      )}
      {me.kind === "no-player" && (
        <Button asChild variant="secondary" size="lg" className="w-full lg:w-auto">
          <Link href={me.claimHref} transitionTypes={["nav-forward"]}>
            <IdCard aria-hidden="true" />
            Vinculá tu ficha para votar
          </Link>
        </Button>
      )}
      {me.kind === "not-participant" && <p className="text-sm text-muted-foreground">Votan solo quienes jugaron el partido.</p>}
      {adminActions}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        Los votos son anónimos. Las calificaciones se publican al cierre.
      </p>
    </div>
  );
}

export interface PublishedRating {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  side: VoteSide | null;
  votes: number;
  adjustedAverage: number | null;
}

/** Calificaciones publicadas al cierre: promedio corregido (1 decimal) y votos; el MVP en dorado. */
export function MatchRatingsList({ ratings, mvpId, playerHref }: { ratings: PublishedRating[]; mvpId: string | null; playerHref: (id: string) => string }) {
  if (ratings.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={Vote}
        tone="neutral"
        title="Nadie votó en este partido"
        description="Las calificaciones aparecen cuando hay votos al cierre."
      />
    );
  }
  return (
    <ol className="list-group" aria-label="Calificaciones">
      {ratings.map((r, index) => {
        const isMvp = r.playerId === mvpId;
        return (
          <li key={r.playerId}>
            <Link
              href={playerHref(r.playerId)}
              transitionTypes={["nav-forward"]}
              className={cn(
                "pressable-row relative flex min-h-14 items-center gap-3 px-4 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                isMvp && "bg-gold/8",
              )}
            >
              <span className="w-5 text-right text-xs text-muted-foreground tabular">{index + 1}</span>
              <UserAvatar name={r.nickname} src={r.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  {r.side && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", SIDE_DOT[r.side])} />}
                  <span className="truncate text-[15px] font-semibold">{r.nickname}</span>
                  {isMvp && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/14 px-1.5 text-2xs font-semibold text-gold ring-1 ring-gold/25 ring-inset">
                      <Star className="size-3 fill-current" aria-hidden="true" />
                      MVP
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground tabular">
                  {r.votes} {r.votes === 1 ? "voto" : "votos"}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-display text-2xl leading-none font-extrabold tabular",
                  isMvp ? "text-gold" : r.adjustedAverage === null ? "text-muted-foreground" : "text-foreground",
                )}
              >
                <span className="sr-only">Promedio </span>
                {r.adjustedAverage === null ? "—" : formatDecimal(r.adjustedAverage)}
              </span>
              <LinkPending />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export interface PendingVotingItem {
  matchId: string;
  href: string;
  dayLabel: string;
  closesAt: string;
  rated: number;
  total: number;
  /** Nombre del grupo (en Mis grupos, donde se mezclan votaciones de varios grupos). */
  groupName?: string;
}

/** Aviso del inicio del grupo (y de Mis grupos): votaciones abiertas que me faltan completar. */
export function PendingVotingBanner({ items, nowMs }: { items: PendingVotingItem[]; nowMs: number }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Votación abierta" className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.matchId}
          href={item.href}
          transitionTypes={["nav-forward"]}
          className="pressable relative flex items-center gap-3 rounded-xl bg-primary/10 p-4 ring-1 ring-primary/30 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-solid text-primary-foreground shadow-glow">
            <Vote className="size-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-2xs font-semibold tracking-[0.12em] text-primary uppercase">
              Votación abierta{item.groupName ? ` · ${item.groupName}` : ""}
            </span>
            <span className="block truncate text-[15px] font-semibold">Calificá el partido del {item.dayLabel}</span>
            <span className={cn("block text-xs tabular", closesSoon(item.closesAt, nowMs) ? "font-medium text-warning" : "text-muted-foreground")}>
              {item.rated > 0 ? `${item.rated} de ${item.total} calificados · ` : ""}
              {closesInLabel(item.closesAt, nowMs)}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-primary">Votar</span>
          <LinkPending />
        </Link>
      ))}
    </section>
  );
}
