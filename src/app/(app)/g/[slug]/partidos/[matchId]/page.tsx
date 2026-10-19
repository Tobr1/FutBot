import { CalendarClock, ClipboardList, Shuffle, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/domain/matches/datetime";
import { canEditParticipants, canEditTeams, canRecordResult } from "@/domain/matches/status";
import { voteTargets, votingPhase } from "@/domain/voting/voting";
import { getGroupContext } from "@/features/groups/queries";
import { MatchAdminMenu } from "@/features/matches/components/match-admin-menu";
import { MatchHero, ParticipantList, ResultSummary, TeamColumns } from "@/features/matches/components/match-detail";
import { ParticipantsSheet } from "@/features/matches/components/participants-sheet";
import { getMatch, listRosterForMatches } from "@/features/matches/queries";
import { getGroupRatings, getMatchRatings, syncSkillHistory } from "@/features/stats/queries";
import {
  MatchRatingsList,
  type MyVoteStatus,
  OpenVotingCard,
  type PublishedRating,
} from "@/features/voting/components/voting-section";
import { finalizeVoting, getMyVotes, getVotingProgress } from "@/features/voting/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

const FLASH = {
  creado: { "1": "¡Partido creado!" },
  editado: { "1": "Cambios guardados." },
  equipos: { "1": "Equipos guardados." },
  resultado: { "1": "Resultado guardado." },
  votos: { "1": "¡Votos enviados! Podés cambiarlos hasta el cierre." },
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
  const loaded = await getMatch(ctx.group.id, matchId);
  if (!loaded) notFound();

  const timeZone = ctx.group.timezone;
  const dayLabel = formatMatchDate(loaded.scheduledAt, timeZone);
  const editableParticipants = ctx.isAdmin && canEditParticipants(loaded.status);
  const [roster, engine] = await Promise.all([
    editableParticipants ? listRosterForMatches(ctx.group.id) : Promise.resolve([]),
    getGroupRatings(ctx.group.id),
  ]);

  await connection();
  const now = new Date();
  const nowMs = now.getTime();

  // Votación: abierta (progreso y botón) o cerrada (calificaciones publicadas).
  let match = loaded;
  const phase = votingPhase(loaded.status, loaded.votingClosesAt, nowMs);
  let votingBlock: ReactNode = null;
  if (phase === "open") {
    const myId = ctx.myPlayer?.id ?? null;
    const targets = voteTargets({ a: loaded.teams.a.memberIds, b: loaded.teams.b.memberIds }, myId);
    const [progress, myVotes] = await Promise.all([
      getVotingProgress(loaded.id),
      myId && targets.mySide ? getMyVotes(loaded.id, myId) : Promise.resolve({} as Record<string, number>),
    ]);
    const me: MyVoteStatus = !myId
      ? { kind: "no-player", claimHref: routes.claimPlayer(slug) }
      : targets.mySide
        ? { kind: "can-vote", rated: Object.keys(myVotes).length, total: targets.teammates.length + targets.rivals.length }
        : { kind: "not-participant" };
    votingBlock = (
      <OpenVotingCard
        closesAt={loaded.votingClosesAt!}
        nowMs={nowMs}
        voters={progress?.voters ?? 0}
        eligible={progress?.eligibleVoters ?? 0}
        voteHref={routes.matchVote(slug, loaded.id)}
        me={me}
      />
    );
  } else if (phase === "closed") {
    // MVP por votos de forma perezosa (idempotente) la primera vez que alguien lo ve cerrado.
    if (!loaded.mvp) {
      const mvpId = await finalizeVoting(loaded.id);
      if (mvpId) match = { ...loaded, mvp: { playerId: mvpId, source: "votes" } };
      await syncSkillHistory(ctx.group.id);
    }
    const published = await getMatchRatings(ctx.group.id, loaded.id);
    const byId = new Map(loaded.participants.map((p) => [p.id, p]));
    const ratings: PublishedRating[] = published.flatMap((r) => {
      const p = byId.get(r.playerId);
      return p
        ? [{ playerId: r.playerId, nickname: p.nickname, avatarUrl: p.avatarUrl, side: p.side, votes: r.votes, adjustedAverage: r.adjustedAverage }]
        : [];
    });
    votingBlock = (
      <MatchRatingsList ratings={ratings} mvpId={match.mvp?.playerId ?? null} playerHref={(id) => routes.player(slug, id)} />
    );
  }
  const ratingById: Record<string, number> = {};
  for (const p of loaded.participants) ratingById[p.id] = engine.byPlayer[p.id]?.skill ?? p.baseRating;

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

        <MatchHero match={match} timeZone={timeZone} today={todayIso(timeZone, now)} nowMs={nowMs} />

        {!finished && match.notes && (
          <p className="panel rounded-xl p-4 text-sm whitespace-pre-line text-muted-foreground">{match.notes}</p>
        )}

        {finished && (
          <section aria-labelledby="resultado" className="space-y-1">
            <SectionHeader id="resultado" title="Resultado" />
            <ResultSummary match={match} ratings={ratingById} />
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
            <TeamColumns match={match} mvpId={match.mvp?.playerId} ratings={ratingById} />
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
                  baseRating: engine.byPlayer[p.id]?.skill ?? p.baseRating,
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
            <SectionHeader id="votacion" title={phase === "closed" ? "Calificaciones" : "Votación"} />
            {votingBlock ?? (
              <EmptyState
                size="sm"
                icon={CalendarClock}
                tone="neutral"
                title="Se vota después del partido"
                description="Con el resultado cargado, quienes jugaron califican a compañeros y rivales."
              />
            )}
          </section>
        )}
      </div>
    </ScreenTransition>
  );
}
