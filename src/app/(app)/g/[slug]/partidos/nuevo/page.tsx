import type { Metadata } from "next";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { getGroupContext } from "@/features/groups/queries";
import { CreateMatchForm } from "@/features/matches/components/create-match-form";
import { listRosterForMatches } from "@/features/matches/queries";
import { timeZoneLabel } from "@/features/matches/time-zone";
import { getGroupRatings } from "@/features/stats/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Nuevo partido" };

export default async function NewMatchPage({ params }: PageProps<"/g/[slug]/partidos/nuevo">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.groupMatches(slug)} />;

  const [roster, engine] = await Promise.all([listRosterForMatches(ctx.group.id), getGroupRatings(ctx.group.id)]);

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.groupMatches(slug)} backLabel="Partidos" title="Nuevo partido" />
        <PageHeader title="Nuevo partido" description="Fecha, cancha y quiénes juegan." />
        {/* Sin Card: su overflow-hidden rompería la barra de acciones pegajosa en el teléfono. */}
        <div className="lg:panel lg:rounded-xl lg:p-6">
          <CreateMatchForm
            groupId={ctx.group.id}
            timeZone={ctx.group.timezone}
            timeZoneLabel={timeZoneLabel(ctx.group.timezone)}
            defaultPlayersPerTeam={ctx.group.default_players_per_team}
            roster={roster.map((p) => ({
              id: p.id,
              nickname: p.nickname,
              fullName: p.fullName,
              aliases: p.aliases,
              avatarUrl: p.avatarUrl,
              baseRating: engine.byPlayer[p.id]?.skill ?? p.baseRating,
              primaryPosition: p.positions.primary,
              isActive: p.isActive,
            }))}
          />
        </div>
      </div>
    </ScreenTransition>
  );
}
