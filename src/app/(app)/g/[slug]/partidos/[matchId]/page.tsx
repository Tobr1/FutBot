import { ClipboardList, Shuffle, Trophy, UsersRound, Vote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/domain/matches/datetime";
import { canEditParticipants, canEditTeams, canRecordResult } from "@/domain/matches/status";
import { getGroupContext } from "@/features/groups/queries";
import { MatchAdminMenu } from "@/features/matches/components/match-admin-menu";
import { MatchHero, ParticipantList, ResultSummary, TeamColumns } from "@/features/matches/components/match-detail";
import { ParticipantsSheet } from "@/features/matches/components/participants-sheet";
import { getMatch, listRosterForMatches } from "@/features/matches/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

const FLASH = {
  creado: { "1": "¡Partido creado!" },
  editado: { "1": "Cambios guardados." },
  equipos: { "1": "Equipos guardados." },
  resultado: { "1": "Resultado guardado." },
};

export async function generateMetadata({ params }: PageProps<"/g/[slug]/partidos/[matchId]">) {
  const { slug, matchId } = await params;
  const ctx = await getGroupContext(slug);
  const match = await getMatch(ctx.group.id, matchId);
  return { title: match ? `Partido del ${formatMatchDate(match.scheduledAt, ctx.group.timezone)}` : "Partido" };
}

export default async function MatchPage({ params }: PageProps<"/g/[slug]/partidos/[matchId]">) {
  const { slug, matchId } = await params;
  const ctx = await getGroupContext(slug);
  const match = await getMatch(ctx.group.id, matchId);
  if (!match) notFound();

  const timeZone = ctx.group.timezone;
  const dayLabel = formatMatchDate(match.scheduledAt, timeZone);
  const editableParticipants = ctx.isAdmin && canEditParticipants(match.status);
  const roster = editableParticipants ? await listRosterForMatches(ctx.group.id) : [];

  await connection();
  const now = new Date();

  const confirmedCount = match.participants.filter((p) => p.status === "confirmed").length;
  const finished = match.status === "finished";
  const cancelled = match.status === "cancelled";

  return (
    <ScreenTransition>
      <Suspense fallback={null}>
        <FlashToast messages={FLASH} />
      </Suspense>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader
          backHref={routes.groupMatches(slug)}
          backLabel="Partidos"
          title={`Partido del ${dayLabel}`}
          actions={
            ctx.isAdmin && (
              <MatchAdminMenu
                groupId={ctx.group.id}
                matchId={match.id}
                status={match.status}
                editHref={routes.editMatch(slug, match.id)}
                dayLabel={dayLabel}
              />
            )
          }
        />

        <MatchHero match={match} timeZone={timeZone} today={todayIso(timeZone, now)} nowMs={now.getTime()} />

        {!finished && match.notes && (
          <p className="panel rounded-xl p-4 text-sm whitespace-pre-line text-muted-foreground">{match.notes}</p>
        )}

        {finished && (
          <section aria-labelledby="resultado" className="space-y-1">
            <SectionHeader id="resultado" title="Resultado" />
            <ResultSummary match={match} />
            {ctx.isAdmin && (
              <Button asChild variant="secondary" className="mt-3 w-full lg:w-auto">
                <Link href={routes.matchResult(slug, match.id)} transitionTypes={["nav-forward"]}>
                  <ClipboardList aria-hidden="true" />
                  Corregir resultado
                </Link>
              </Button>
            )}
          </section>
        )}

        <section aria-labelledby="equipos" className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader id="equipos" title="Equipos" className="flex-1" />
            {ctx.isAdmin && match.teamsReady && canEditTeams(match.status) && (
              <Button asChild variant="secondary" size="sm">
                <Link href={routes.matchTeams(slug, match.id)} transitionTypes={["nav-forward"]}>
                  <Shuffle aria-hidden="true" />
                  {finished ? "Corregir" : "Cambiar"}
                </Link>
              </Button>
            )}
          </div>
          {match.teamsReady ? (
            <TeamColumns match={match} mvpId={match.mvp?.playerId} />
          ) : (
            <EmptyState
              size="sm"
              icon={Shuffle}
              title="Equipos sin armar"
              description={
                cancelled
                  ? "El partido está cancelado."
                  : confirmedCount < 2
                    ? "Primero convocá al menos a dos jugadores."
                    : ctx.isAdmin
                      ? `Repartí a los ${confirmedCount} titulares en dos equipos.`
                      : "Un admin todavía no armó los equipos."
              }
              action={
                ctx.isAdmin &&
                !cancelled &&
                confirmedCount >= 2 && (
                  <Button asChild size="sm">
                    <Link href={routes.matchTeams(slug, match.id)} transitionTypes={["nav-forward"]}>
                      Armar equipos
                    </Link>
                  </Button>
                )
              }
            />
          )}
          {ctx.isAdmin && !finished && canRecordResult(match.status, match.teamsReady) && (
            <Button asChild size="lg" className="mt-3 w-full lg:w-auto">
              <Link href={routes.matchResult(slug, match.id)} transitionTypes={["nav-forward"]}>
                <Trophy aria-hidden="true" />
                Cargar resultado
              </Link>
            </Button>
          )}
        </section>

        <section aria-labelledby="convocados" className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader id="convocados" title="Convocados" count={match.participants.length} className="flex-1" />
            {editableParticipants && (
              <ParticipantsSheet
                groupId={ctx.group.id}
                matchId={match.id}
                playersPerTeam={match.playersPerTeam}
                initial={match.participants.flatMap((p) =>
                  p.status === "confirmed" || p.status === "reserve" ? [{ playerId: p.id, status: p.status }] : [],
                )}
                roster={roster.map((p) => ({
                  id: p.id,
                  nickname: p.nickname,
                  fullName: p.fullName,
                  avatarUrl: p.avatarUrl,
                  baseRating: p.baseRating,
                  primaryPosition: p.positions.primary,
                  isActive: p.isActive,
                }))}
              />
            )}
          </div>
          {match.participants.length === 0 ? (
            <EmptyState
              size="sm"
              icon={UsersRound}
              title="Nadie convocado todavía"
              description={editableParticipants ? "Tocá Editar para sumar jugadores." : undefined}
            />
          ) : (
            <ParticipantList participants={match.participants} />
          )}
        </section>

        {!cancelled && (
          <section aria-labelledby="votacion" className="space-y-1">
            <SectionHeader id="votacion" title="Votación" />
            <EmptyState
              size="sm"
              icon={Vote}
              title="Muy pronto"
              description="Después del partido vas a poder calificar a compañeros y rivales."
            />
          </section>
        )}
      </div>
    </ScreenTransition>
  );
}
