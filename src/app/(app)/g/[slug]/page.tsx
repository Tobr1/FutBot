import { CalendarDays, ChevronRight, IdCard, Trophy, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { PageHeader } from "@/components/shared/page-header";
import { PlayerCard, RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/features/groups/components/onboarding-checklist";
import { getGroupContext, listMembers, listSeasons } from "@/features/groups/queries";
import { listPlayers } from "@/features/players/queries";
import { routes } from "@/lib/routes";

const FLASH = {
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
  const [players, members, seasons] = await Promise.all([
    listPlayers(ctx.group.id),
    listMembers(ctx.group.id),
    listSeasons(ctx.group.id),
  ]);

  const activePlayers = players.filter((p) => p.isActive);
  const currentSeason = seasons.find((s) => !s.ends_on) ?? seasons[0];
  const myPlayer = ctx.myPlayer ? players.find((p) => p.id === ctx.myPlayer?.id) : undefined;
  const topPlayers = [...activePlayers].sort((a, b) => b.baseRating - a.baseRating).slice(0, 5);
  const minSquad = ctx.group.default_players_per_team * 2;

  const steps = [
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
      done: false,
      disabledReason: "Disponible en la próxima etapa (Fase 2).",
    },
  ];
  const showOnboarding = ctx.isAdmin && steps.some((s) => !s.done && s.href);

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <FlashToast messages={FLASH} />
      </Suspense>

      <PageHeader
        eyebrow={currentSeason?.name ?? "Grupo"}
        title={ctx.group.name}
        description={ctx.group.description ?? undefined}
        actions={
          ctx.isAdmin && (
            <Button variant="secondary" asChild>
              <Link href={routes.groupInvitations(slug)}>
                <UserPlus aria-hidden="true" />
                Invitar
              </Link>
            </Button>
          )
        }
      />

      {!ctx.myPlayer && (
        <Link
          href={routes.claimPlayer(slug)}
          className="flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 transition-colors hover:bg-gold/15"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
            <IdCard className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Vinculá tu ficha de jugador</p>
            <p className="text-sm text-muted-foreground">Elegí tu nombre en el plantel o creá tu ficha para sumar estadísticas.</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
        </Link>
      )}

      {showOnboarding && <OnboardingChecklist steps={steps} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section aria-labelledby="next-match" className="space-y-3">
            <h2 id="next-match" className="font-display text-xl font-bold tracking-wide uppercase">
              Próximo partido
            </h2>
            <EmptyState
              icon={CalendarDays}
              title="Sin partidos todavía"
              description="La creación de partidos, el importador de listas de WhatsApp y la carga de resultados llegan en la Fase 2."
            />
          </section>

          <section aria-labelledby="top-players" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="top-players" className="font-display text-xl font-bold tracking-wide uppercase">
                Plantel destacado
              </h2>
              <Link href={routes.groupPlayers(slug)} className="text-sm font-medium text-primary hover:underline">
                Ver plantel
              </Link>
            </div>
            {topPlayers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Plantel vacío"
                description={ctx.isAdmin ? "Cargá a los jugadores del grupo para empezar." : "Un admin todavía no cargó jugadores."}
                action={
                  ctx.isAdmin && (
                    <Button asChild>
                      <Link href={routes.newPlayer(slug)}>Agregar jugadores</Link>
                    </Button>
                  )
                }
              />
            ) : (
              <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/70">
                {topPlayers.map((player, index) => (
                  <li key={player.id}>
                    <Link
                      href={routes.player(slug, player.id)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="w-5 text-center font-display text-lg font-bold text-muted-foreground tabular">{index + 1}</span>
                      <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-medium">{player.nickname}</span>
                      {player.positions.primary && <PositionBadge position={player.positions.primary} />}
                      <RatingPill rating={player.baseRating} />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              Por ahora el orden usa el nivel inicial. Con partidos jugados, la valoración se calcula sola.
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          {myPlayer && (
            <section aria-labelledby="my-card" className="space-y-3">
              <h2 id="my-card" className="font-display text-xl font-bold tracking-wide uppercase">
                Mi ficha
              </h2>
              <Link href={routes.player(slug, myPlayer.id)} className="block max-w-[240px]">
                <PlayerCard
                  player={{
                    nickname: myPlayer.nickname,
                    fullName: myPlayer.fullName,
                    avatarUrl: myPlayer.avatarUrl,
                    rating: myPlayer.baseRating,
                    primaryPosition: myPlayer.positions.primary,
                    isProvisional: myPlayer.stats.matches < 3,
                    stats: myPlayer.stats,
                  }}
                />
              </Link>
            </section>
          )}
          <section className="rounded-2xl border border-border bg-card/70 p-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-wide uppercase">
              <Trophy className="size-4 text-gold" aria-hidden="true" />
              El grupo
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Jugadores</dt>
                <dd className="font-display text-2xl font-bold tabular">{activePlayers.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Con cuenta</dt>
                <dd className="font-display text-2xl font-bold tabular">{members.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Formato</dt>
                <dd className="font-display text-2xl font-bold">F{ctx.group.default_players_per_team}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tu rol</dt>
                <dd className="font-display text-2xl font-bold">{ctx.isAdmin ? "Admin" : "Jugador"}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
