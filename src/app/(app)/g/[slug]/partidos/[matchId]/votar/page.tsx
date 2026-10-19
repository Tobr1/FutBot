import { CalendarClock, Clock, IdCard, Lock, UserX, Vote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/domain/matches/datetime";
import { closesInLabel, closesSoon, voteTargets, votingPhase } from "@/domain/voting/voting";
import { getGroupContext } from "@/features/groups/queries";
import { getMatch } from "@/features/matches/queries";
import { type VoteGroup, VotingForm } from "@/features/voting/components/voting-form";
import { getMyVotes } from "@/features/voting/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Votar" };

export default async function MatchVotePage({ params }: PageProps<"/g/[slug]/partidos/[matchId]/votar">) {
  const { slug, matchId } = await params;
  const ctx = await getGroupContext(slug);
  const match = await getMatch(ctx.group.id, matchId);
  if (!match) notFound();

  const matchHref = routes.match(slug, match.id);
  const dayLabel = formatMatchDate(match.scheduledAt, ctx.group.timezone);
  const me = ctx.myPlayer?.id ?? null;
  const targets = voteTargets({ a: match.teams.a.memberIds, b: match.teams.b.memberIds }, me);
  const saved = me && targets.mySide ? await getMyVotes(match.id, me) : {};

  // La hora actual solo después de connection(): la página es dinámica.
  await connection();
  const nowMs = new Date().getTime();
  const phase = votingPhase(match.status, match.votingClosesAt, nowMs);

  const back = (
    <Button asChild variant="secondary" size="lg">
      <Link href={matchHref} transitionTypes={["nav-back"]}>
        Volver al partido
      </Link>
    </Button>
  );

  let body: ReactNode;
  if (phase === "pending") {
    body = (
      <EmptyState
        icon={CalendarClock}
        headingLevel="h2"
        title="Todavía no se vota"
        description="La votación abre cuando se carga el resultado del partido."
        action={back}
      />
    );
  } else if (phase === "closed") {
    body = (
      <EmptyState
        icon={Lock}
        tone="neutral"
        headingLevel="h2"
        title="La votación cerró"
        description="Las calificaciones ya están publicadas en el partido."
        action={
          <Button asChild size="lg">
            <Link href={`${matchHref}#votacion`} transitionTypes={["nav-back"]}>
              Ver calificaciones
            </Link>
          </Button>
        }
      />
    );
  } else if (!me) {
    body = (
      <EmptyState
        icon={IdCard}
        headingLevel="h2"
        title="Vinculá tu ficha"
        description="Para votar, elegí tu nombre en el plantel. Así sabemos que jugaste."
        action={
          <Button asChild size="lg">
            <Link href={routes.claimPlayer(slug)} transitionTypes={["nav-forward"]}>
              Vincular mi ficha
            </Link>
          </Button>
        }
      />
    );
  } else if (!targets.mySide) {
    body = (
      <EmptyState
        icon={UserX}
        tone="neutral"
        headingLevel="h2"
        title="No jugaste este partido"
        description="Votan solo quienes estuvieron en alguno de los dos equipos."
        action={back}
      />
    );
  } else {
    const byId = new Map(match.participants.map((p) => [p.id, p]));
    const toPlayers = (ids: string[]) =>
      ids.flatMap((id) => {
        const p = byId.get(id);
        return p ? [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl, position: p.positions.primary }] : [];
      });
    const mySide = targets.mySide;
    const rivalSide = mySide === "a" ? "b" : "a";
    const groups: VoteGroup[] = [
      { key: "teammates", title: "Tu equipo", side: mySide, teamName: match.teams[mySide].name, players: toPlayers(targets.teammates) },
      { key: "rivals", title: "Rivales", side: rivalSide, teamName: match.teams[rivalSide].name, players: toPlayers(targets.rivals) },
    ];
    const closesAt = match.votingClosesAt!;
    body = (
      <>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 ring-inset",
              closesSoon(closesAt, nowMs) ? "bg-warning/12 text-warning ring-warning/25" : "bg-surface-2 text-muted-foreground ring-hairline",
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {closesInLabel(closesAt, nowMs)}
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs font-medium text-muted-foreground ring-1 ring-hairline ring-inset">
            <Lock className="size-3.5" aria-hidden="true" />
            Tus votos son anónimos
          </span>
        </div>
        {targets.teammates.length + targets.rivals.length === 0 ? (
          <EmptyState icon={Vote} headingLevel="h2" title="No hay a quién calificar" action={back} />
        ) : (
          <div className="max-w-2xl">
            <VotingForm groupId={ctx.group.id} matchId={match.id} groups={groups} saved={saved} />
          </div>
        )}
      </>
    );
  }

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={matchHref} backLabel={`Partido del ${dayLabel}`} title="Votar" />
        <PageHeader
          title="Votar"
          description={`Partido del ${dayLabel}. Calificá de 1 a 10 a cada uno según cómo jugó ese día.`}
        />
        {body}
      </div>
    </ScreenTransition>
  );
}
