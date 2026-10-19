import { UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/domain/matches/datetime";
import type { Side } from "@/domain/matches/result";
import { canEditTeams, formatLabel } from "@/domain/matches/status";
import { getGroupContext } from "@/features/groups/queries";
import { TeamBuilder } from "@/features/matches/components/team-builder";
import { getMatch } from "@/features/matches/queries";
import { getGroupRatings } from "@/features/stats/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Armar equipos" };

export default async function MatchTeamsPage({ params }: PageProps<"/g/[slug]/partidos/[matchId]/equipos">) {
  const { slug, matchId } = await params;
  const ctx = await getGroupContext(slug);
  const match = await getMatch(ctx.group.id, matchId);
  if (!match) notFound();

  const matchHref = routes.match(slug, match.id);
  if (!ctx.isAdmin) return <AccessDenied backHref={matchHref} />;

  const engine = await getGroupRatings(ctx.group.id);
  const dayLabel = formatMatchDate(match.scheduledAt, ctx.group.timezone);
  const confirmed = match.participants.filter((p) => p.status === "confirmed");
  const initial: Record<string, Side> = {};
  for (const p of confirmed) if (p.side) initial[p.id] = p.side;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={matchHref} backLabel={`Partido del ${dayLabel}`} title="Armar equipos" focusFlow />
        <PageHeader
          title="Armar equipos"
          description={`${formatLabel(match.playersPerTeam)} · ${confirmed.length} titulares. El nivel es la valoración actual de cada uno.`}
        />
        {!canEditTeams(match.status) ? (
          <EmptyState
            icon={UsersRound}
            tone="neutral"
            headingLevel="h2"
            title="Partido cancelado"
            description="Reactivalo para armar los equipos."
            action={
              <Button asChild variant="secondary" size="lg">
                <Link href={matchHref} transitionTypes={["nav-back"]}>
                  Volver al partido
                </Link>
              </Button>
            }
          />
        ) : confirmed.length < 2 ? (
          <EmptyState
            icon={UsersRound}
            headingLevel="h2"
            title="Faltan convocados"
            description="Necesitás al menos dos titulares para armar los equipos."
            action={
              <Button asChild size="lg">
                <Link href={matchHref} transitionTypes={["nav-back"]}>
                  Editar convocatoria
                </Link>
              </Button>
            }
          />
        ) : (
          <TeamBuilder
            groupId={ctx.group.id}
            matchId={match.id}
            finished={match.status === "finished"}
            initial={initial}
            initialNames={{ a: match.teams.a.name, b: match.teams.b.name }}
            players={confirmed.map((p) => ({
              id: p.id,
              nickname: p.nickname,
              avatarUrl: p.avatarUrl,
              rating: engine.byPlayer[p.id]?.skill ?? p.baseRating,
              position: p.positions.primary,
            }))}
          />
        )}
      </div>
    </ScreenTransition>
  );
}
