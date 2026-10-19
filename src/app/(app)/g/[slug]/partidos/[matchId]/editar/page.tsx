import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { formatMatchDate, isoToZoned } from "@/domain/matches/datetime";
import { getGroupContext } from "@/features/groups/queries";
import { EditMatchForm } from "@/features/matches/components/edit-match-form";
import { getMatch } from "@/features/matches/queries";
import { timeZoneLabel } from "@/features/matches/time-zone";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Editar partido" };

export default async function EditMatchPage({ params }: PageProps<"/g/[slug]/partidos/[matchId]/editar">) {
  const { slug, matchId } = await params;
  const ctx = await getGroupContext(slug);
  const match = await getMatch(ctx.group.id, matchId);
  if (!match) notFound();
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.match(slug, match.id)} />;

  const timeZone = ctx.group.timezone;
  const local = isoToZoned(match.scheduledAt, timeZone);
  const dayLabel = formatMatchDate(match.scheduledAt, timeZone);

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.match(slug, match.id)} backLabel={`Partido del ${dayLabel}`} title="Editar partido" />
        <PageHeader title="Editar partido" description="La convocatoria y los equipos se editan desde el partido." />
        <div className="lg:panel lg:rounded-xl lg:p-6">
          <EditMatchForm
            groupId={ctx.group.id}
            matchId={match.id}
            timeZoneLabel={timeZoneLabel(timeZone)}
            defaults={{
              date: local.date,
              time: local.time,
              venue: match.venue ?? "",
              playersPerTeam: match.playersPerTeam,
              notes: match.notes ?? "",
            }}
          />
        </div>
      </div>
    </ScreenTransition>
  );
}
