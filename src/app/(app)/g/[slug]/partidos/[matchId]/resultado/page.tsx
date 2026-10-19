import { Shuffle } from "lucide-react";
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
import { eventsToDraft, type Side } from "@/domain/matches/result";
import { canRecordResult } from "@/domain/matches/status";
import { getGroupContext } from "@/features/groups/queries";
import { ResultEditor, type ResultTeam } from "@/features/matches/components/result-editor";
import { getMatch } from "@/features/matches/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Resultado" };

export default async function MatchResultPage({ params }: PageProps<"/g/[slug]/partidos/[matchId]/resultado">) {
  const { slug, matchId } = await params;
  const ctx = await getGroupContext(slug);
  const match = await getMatch(ctx.group.id, matchId);
  if (!match) notFound();

  const matchHref = routes.match(slug, match.id);
  if (!ctx.isAdmin) return <AccessDenied backHref={matchHref} />;

  const dayLabel = formatMatchDate(match.scheduledAt, ctx.group.timezone);
  const isCorrection = match.status === "finished";
  const title = isCorrection ? "Corregir resultado" : "Cargar resultado";

  const byId = new Map(match.participants.map((p) => [p.id, p]));
  const team = (side: Side): ResultTeam => ({
    name: match.teams[side].name,
    members: match.teams[side].memberIds.flatMap((id) => {
      const p = byId.get(id);
      return p ? [{ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }] : [];
    }),
  });
  // Un MVP que ya no está en ningún equipo (se lo sacó al corregir) no se
  // precarga: la RPC lo rechazaría y no habría forma de guardar.
  const adminMvp =
    match.mvp?.source === "admin" && (match.teams.a.memberIds.includes(match.mvp.playerId) || match.teams.b.memberIds.includes(match.mvp.playerId))
      ? match.mvp.playerId
      : null;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={matchHref} backLabel={`Partido del ${dayLabel}`} title={title} />
        <PageHeader title={title} description={`Partido del ${dayLabel}.`} />
        {canRecordResult(match.status, match.teamsReady) ? (
          <div className="max-w-2xl">
            <ResultEditor
              groupId={ctx.group.id}
              matchId={match.id}
              teams={{ a: team("a"), b: team("b") }}
              initial={eventsToDraft(match.teams.a.score, match.teams.b.score, match.events)}
              initialMvp={adminMvp}
              initialNotes={match.notes ?? ""}
              isCorrection={isCorrection}
            />
          </div>
        ) : (
          <EmptyState
            icon={Shuffle}
            headingLevel="h2"
            title={match.status === "cancelled" ? "Partido cancelado" : "Primero armá los equipos"}
            description={
              match.status === "cancelled"
                ? "Reactivalo para cargar el resultado."
                : "El resultado se carga sobre los dos equipos: cada uno necesita al menos un jugador."
            }
            action={
              match.status !== "cancelled" && (
                <Button asChild size="lg">
                  <Link href={routes.matchTeams(slug, match.id)} transitionTypes={["nav-forward"]}>
                    Armar equipos
                  </Link>
                </Button>
              )
            }
          />
        )}
      </div>
    </ScreenTransition>
  );
}
