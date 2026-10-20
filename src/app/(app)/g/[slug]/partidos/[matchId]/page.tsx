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
import { awardsForMatch } from "@/domain/awards";
import { canChangeAttendance, myAttendance, reservesInOrder } from "@/domain/matches/attendance";
import { formatMatchDate, formatMatchDay, isoToZoned } from "@/domain/matches/datetime";
import { summarizeEvents } from "@/domain/matches/result";
import { matchShareMessage, scorerLabel, shareFileName } from "@/domain/share/text";
import { AwardFeed } from "@/features/awards/components/award-lists";
import { getGroupAwards } from "@/features/awards/queries";
import { canEditParticipants, canEditTeams, canRecordResult } from "@/domain/matches/status";
import { teamForecast } from "@/domain/matches/team-generator";
import { voteTargets, votingPhase } from "@/domain/voting/voting";
import { getGroupContext } from "@/features/groups/queries";
import { AttendanceCard } from "@/features/matches/components/attendance-card";
import { MatchAdminMenu } from "@/features/matches/components/match-admin-menu";
import { MatchHero, ParticipantList, ResultSummary, TeamColumns } from "@/features/matches/components/match-detail";
import { ParticipantsSheet } from "@/features/matches/components/participants-sheet";
import { WhatsAppCallButton } from "@/features/matches/components/whatsapp-call-button";
import { ShareActions } from "@/features/share/components/share-actions";
import { getMatch, listRosterForMatches } from "@/features/matches/queries";
import { getGroupRatings, getMatchRatings, syncSkillHistory } from "@/features/stats/queries";
import { ForecastCard } from "@/features/teams/components/win-probability";
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

  const confirmed = match.participants.filter((p) => p.status === "confirmed");
  const confirmedCount = confirmed.length;
  const reserves = reservesInOrder(match.participants);
  const notGoing = match.participants.filter((p) => p.status === "dropped");
  const capacity = match.playersPerTeam * 2;
  // "Voy / No voy": partido programado que todavía no empezó.
  const attendanceOpen = canChangeAttendance(match.status, match.scheduledAt, nowMs);
  // Pronóstico con la valoración actual: solo con equipos armados y antes de jugarse.
  const forecast =
    match.teamsReady && (match.status === "scheduled" || match.status === "in_progress")
      ? teamForecast({ a: match.teams.a.memberIds, b: match.teams.b.memberIds }, (id) => ratingById[id])
      : null;
  const finished = match.status === "finished";
  const cancelled = match.status === "cancelled";

  // Destacados (logros ganados en este partido) y textos para compartir el resultado.
  const highlights = finished
    ? awardsForMatch(
        (await getGroupAwards(ctx.group.id, { today: todayIso(timeZone, now), minMatches: ctx.group.ranking_min_matches })).awards,
        match.id,
      )
    : [];
  const nicknames = Object.fromEntries(match.participants.map((p) => [p.id, { nickname: p.nickname, avatarUrl: p.avatarUrl }]));
  const share = finished
    ? (() => {
        const scoreA = match.teams.a.score ?? 0;
        const scoreB = match.teams.b.score ?? 0;
        const summary = summarizeEvents(scoreA, scoreB, match.events, (id) => nicknames[id]?.nickname ?? id);
        const scorers = [...summary.a.scorers, ...summary.b.scorers].map((t) => scorerLabel(nicknames[t.playerId]?.nickname ?? "—", t.count));
        return {
          fileName: shareFileName("partido", isoToZoned(match.scheduledAt, timeZone).date),
          text: matchShareMessage({
            groupName: ctx.group.name,
            dateLabel: dayLabel,
            teams: { a: { name: match.teams.a.name, score: scoreA }, b: { name: match.teams.b.name, score: scoreB } },
            scorers,
            mvp: match.mvp ? (nicknames[match.mvp.playerId]?.nickname ?? null) : null,
          }),
        };
      })()
    : null;

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

        {attendanceOpen && (
          <div className="space-y-3">
            <AttendanceCard
              matchId={match.id}
              attendance={myAttendance(match.participants, ctx.myPlayer?.id ?? null)}
              free={Math.max(0, capacity - confirmedCount)}
              claimHref={ctx.myPlayer ? undefined : routes.claimPlayer(slug)}
            />
            {ctx.isAdmin && (
              <WhatsAppCallButton
                path={routes.match(slug, match.id)}
                message={{
                  groupName: ctx.group.name,
                  whenLabel: formatMatchDay(match.scheduledAt, timeZone),
                  venue: match.venue,
                  confirmed: confirmed.map((p) => p.nickname),
                  reserves: reserves.map((p) => p.nickname),
                  capacity,
                }}
              />
            )}
          </div>
        )}

        {!finished && match.notes && (
          <p className="panel rounded-xl p-4 text-sm whitespace-pre-line text-muted-foreground">{match.notes}</p>
        )}

        {finished && (
          <section aria-labelledby="resultado" className="space-y-1">
            <SectionHeader id="resultado" title="Resultado" />
            <ResultSummary match={match} ratings={ratingById} />
            {share && (
              <ShareActions
                className="mt-3 lg:max-w-sm"
                imageUrl={routes.matchShareImage(slug, match.id)}
                fileName={share.fileName}
                title={`Partido del ${dayLabel}`}
                text={share.text}
                path={routes.match(slug, match.id)}
              />
            )}
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

        {highlights.length > 0 && (
          <section aria-labelledby="destacados" className="space-y-1">
            <SectionHeader id="destacados" title="Destacados del partido" count={highlights.length} />
            <AwardFeed
              awards={highlights}
              players={nicknames}
              playerHref={(id) => routes.player(slug, id)}
              timeZone={timeZone}
              showDate={false}
              label="Destacados del partido"
            />
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
            <>
              <TeamColumns match={match} mvpId={match.mvp?.playerId} ratings={ratingById} />
              {forecast && (
                <ForecastCard
                  className="mt-3"
                  headingLevel="h3"
                  probability={forecast}
                  names={{ a: match.teams.a.name, b: match.teams.b.name }}
                />
              )}
            </>
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
            <SectionHeader id="convocados" title="Convocados" count={confirmedCount + reserves.length} className="flex-1" />
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
          {confirmedCount + reserves.length === 0 ? (
            <EmptyState
              size="sm"
              icon={UsersRound}
              title="Nadie convocado todavía"
              description={editableParticipants ? "Tocá Editar para sumar jugadores." : undefined}
            />
          ) : (
            <ParticipantList participants={match.participants} />
          )}
          {notGoing.length > 0 && (
            <p className="px-1 pt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">No van:</span> {notGoing.map((p) => p.nickname).join(", ")}
            </p>
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
