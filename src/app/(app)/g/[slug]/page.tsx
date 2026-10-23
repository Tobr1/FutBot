import { ChevronRight, IdCard, Plus, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { LinkPending } from "@/components/shared/link-pending";
import { ListGroup } from "@/components/shared/list-group";
import { PlayerCard } from "@/components/shared/player-card";
import { PlayerRow } from "@/components/shared/player-row";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { latestAwards } from "@/domain/awards";
import { formatMatchDate } from "@/domain/matches/datetime";
import { topByRating } from "@/domain/players/sort";
import { AwardFeed } from "@/features/awards/components/award-lists";
import { getGroupAwards } from "@/features/awards/queries";
import { GroupHero } from "@/features/groups/components/group-hero";
import { NextMatchCard } from "@/features/groups/components/next-match-card";
import { type ChecklistStep, OnboardingChecklist } from "@/features/groups/components/onboarding-checklist";
import { getGroupContext, listMembers, listSeasons } from "@/features/groups/queries";
import { getNextMatch } from "@/features/matches/queries";
import { MyPlayerStrip } from "@/features/players/components/my-player-strip";
import { listPlayers } from "@/features/players/queries";
import { ForecastCard } from "@/features/teams/components/win-probability";
import { getForecast, getMatchSides } from "@/features/teams/queries";
import { PendingVotingBanner } from "@/features/voting/components/voting-section";
import { listPendingVotings } from "@/features/voting/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const FLASH = {
  creado: { "1": "¡Grupo creado! Ahora cargá el plantel." },
  bienvenida: { "1": "¡Listo! Ya estás en el grupo." },
  ficha: { vinculada: "Tu ficha quedó vinculada a tu cuenta.", creada: "Creamos tu ficha de jugador." },
};

export async function generateMetadata({ params }: PageProps<"/g/[slug]">) {
  const { slug } = await params;
  const { group } = await getGroupContext(slug);
  return { title: group.name };
}

export default async function GroupHomePage({ params }: PageProps<"/g/[slug]">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const [players, members, seasons, matches] = await Promise.all([
    listPlayers(ctx.group.id),
    listMembers(ctx.group.id),
    listSeasons(ctx.group.id),
    getNextMatch(ctx.group.id),
  ]);
  // La hora actual solo después de connection(): la página es dinámica.
  await connection();
  const now = new Date();
  // Próximo partido con equipos armados: pronóstico con la valoración actual.
  const nextMatch = matches.featured?.kind === "next" ? matches.featured.match : null;
  const [pendingVotings, forecast, awards] = await Promise.all([
    ctx.myPlayer ? listPendingVotings(ctx.group.id, ctx.myPlayer.id, now.toISOString()) : Promise.resolve([]),
    nextMatch ? getMatchSides(nextMatch.id).then((sides) => getForecast(ctx.group.id, sides)) : Promise.resolve(null),
    getGroupAwards(ctx.group.id, { today: todayIso(ctx.group.timezone, now), minMatches: ctx.group.ranking_min_matches }),
  ]);
  const recentAwards = latestAwards(awards.awards, 5);

  const activePlayers = players.filter((p) => p.isActive);
  const currentSeason = seasons.find((s) => !s.ends_on) ?? seasons[0];
  const myPlayer = ctx.myPlayer ? players.find((p) => p.id === ctx.myPlayer?.id) : undefined;
  const topPlayers = topByRating(activePlayers, 5);
  const minSquad = ctx.group.default_players_per_team * 2;

  const steps: ChecklistStep[] = [
    {
      title: "Cargá el plantel",
      description: `Sumá al menos ${minSquad} jugadores (${activePlayers.length} hasta ahora).`,
      done: activePlayers.length >= minSquad,
      href: routes.newPlayer(slug),
      cta: "Agregar",
    },
    {
      title: "Invitá a tus amigos",
      description: "Mandá el link por WhatsApp: cada uno vincula su ficha.",
      done: members.length >= 2,
      href: routes.groupInvitations(slug),
      cta: "Invitar",
    },
    {
      title: "Armá el primer partido",
      description: "Creá el partido, importá la lista y armá los equipos.",
      done: matches.total > 0,
      href: routes.newMatch(slug),
      cta: "Crear",
    },
  ];
  const showOnboarding = ctx.isAdmin && steps.some((s) => !s.done && s.href);

  return (
    <ScreenTransition>
      <Suspense fallback={null}>
        <FlashToast messages={FLASH} />
      </Suspense>

      <div className={cn(myPlayer && "lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8")}>
        <div className="min-w-0 space-y-4 lg:space-y-6">
          <GroupHero
            group={ctx.group}
            seasonName={currentSeason?.name}
            activePlayers={activePlayers.length}
            members={members.length}
            isAdmin={ctx.isAdmin}
            slug={slug}
          />

          {myPlayer ? (
            <MyPlayerStrip slug={slug} player={myPlayer} className="lg:hidden" />
          ) : (
            !ctx.myPlayer && <ClaimBanner slug={slug} />
          )}

          <PendingVotingBanner
            nowMs={now.getTime()}
            items={pendingVotings.map((v) => ({
              matchId: v.matchId,
              href: routes.matchVote(slug, v.matchId),
              dayLabel: formatMatchDate(v.scheduledAt, ctx.group.timezone),
              closesAt: v.closesAt,
              rated: v.rated,
              total: v.total,
            }))}
          />

          <InstallAppCard />

          {showOnboarding && <OnboardingChecklist steps={steps} />}

          <NextMatchCard
            slug={slug}
            featured={matches.featured}
            timeZone={ctx.group.timezone}
            today={todayIso(ctx.group.timezone, now)}
            nowMs={now.getTime()}
            isAdmin={ctx.isAdmin}
          />

          {forecast && nextMatch && (
            <ForecastCard probability={forecast} names={{ a: nextMatch.teams.a.name, b: nextMatch.teams.b.name }} />
          )}

          {recentAwards.length > 0 && (
            <section aria-labelledby="ultimos-logros">
              <SectionHeader id="ultimos-logros" title="Últimos logros" action={{ label: "Salón de la fama", href: routes.groupAwards(slug) }} />
              <AwardFeed
                awards={recentAwards}
                players={awards.players}
                playerHref={(id) => routes.player(slug, id)}
                timeZone={ctx.group.timezone}
                label="Últimos logros"
              />
            </section>
          )}

          <section aria-labelledby="top-del-plantel">
            <SectionHeader
              id="top-del-plantel"
              title="Top del plantel"
              action={topPlayers.length > 0 ? { label: "Ver plantel", href: routes.groupPlayers(slug) } : undefined}
            />
            {topPlayers.length === 0 ? (
              <EmptyState
                size="md"
                icon={Users}
                scene="inicio"
                title="Plantel vacío"
                description={ctx.isAdmin ? "Cargá a los jugadores del grupo para empezar." : "Un admin todavía no cargó jugadores."}
                action={
                  ctx.isAdmin && (
                    <Button asChild>
                      <Link href={routes.newPlayer(slug)} transitionTypes={["nav-forward"]}>
                        <Plus aria-hidden="true" />
                        Agregar jugadores
                      </Link>
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <ListGroup ordered label="Top del plantel">
                  {topPlayers.map((player, index) => (
                    <PlayerRow
                      key={player.id}
                      rank={index + 1}
                      href={routes.player(slug, player.id)}
                      player={{
                        nickname: player.nickname,
                        fullName: player.fullName,
                        avatarUrl: player.avatarUrl,
                        rating: player.rating,
                        primaryPosition: player.positions.primary,
                        stats: player.stats,
                      }}
                    />
                  ))}
                </ListGroup>
                {!players.some((p) => p.stats.matches > 0) && (
                  <p className="mt-2 text-xs text-muted-foreground">Ordenado por nivel inicial hasta que haya partidos.</p>
                )}
              </>
            )}
          </section>
        </div>

        {myPlayer && (
          <aside aria-labelledby="mi-ficha" className="hidden space-y-1 lg:block">
            <SectionHeader id="mi-ficha" title="Mi ficha" />
            <Link
              href={routes.player(slug, myPlayer.id)}
              transitionTypes={["nav-forward"]}
              className="pressable relative block max-w-[240px] rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PlayerCard
                priority
                player={{
                  nickname: myPlayer.nickname,
                  fullName: myPlayer.fullName,
                  avatarUrl: myPlayer.avatarUrl,
                  rating: myPlayer.rating,
                  primaryPosition: myPlayer.positions.primary,
                  isProvisional: myPlayer.isProvisional,
                  stats: myPlayer.stats,
                }}
              />
              <LinkPending />
            </Link>
          </aside>
        )}
      </div>
    </ScreenTransition>
  );
}

function ClaimBanner({ slug }: { slug: string }) {
  return (
    <Link
      href={routes.claimPlayer(slug)}
      transitionTypes={["nav-forward"]}
      className="panel pressable relative flex items-center gap-3 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
        <IdCard className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Vinculá tu ficha</span>
        <span className="block text-sm text-muted-foreground">Elegí tu nombre en el plantel para sumar tus estadísticas.</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <LinkPending />
    </Link>
  );
}
