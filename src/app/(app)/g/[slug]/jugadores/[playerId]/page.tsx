import { ArrowLeft, Award, Goal, HandHelping, Link2, Link2Off, LineChart, Pencil, Percent, Shirt, Swords } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PlayerCard } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { StatTile } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { FOOT_LABELS } from "@/domain/players/positions";
import { getGroupContext } from "@/features/groups/queries";
import { PlayerAdminActions } from "@/features/players/components/player-admin-actions";
import { getPlayer } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/g/[slug]/jugadores/[playerId]">) {
  const { slug, playerId } = await params;
  const ctx = await getGroupContext(slug);
  const player = await getPlayer(ctx.group.id, playerId);
  return { title: player?.nickname ?? "Jugador" };
}

export default async function PlayerPage({ params }: PageProps<"/g/[slug]/jugadores/[playerId]">) {
  const { slug, playerId } = await params;
  const ctx = await getGroupContext(slug);
  const player = await getPlayer(ctx.group.id, playerId);
  if (!player) notFound();

  const isMine = ctx.myPlayer?.id === player.id;
  const { stats } = player;
  const winRate = stats.matches > 0 ? Math.round(((stats.wins + stats.draws * 0.5) / stats.matches) * 100) : null;

  return (
    <div className="space-y-6">
      <Link href={routes.groupPlayers(slug)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Plantel
      </Link>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="mx-auto w-full max-w-[240px]">
          <PlayerCard
            player={{
              nickname: player.nickname,
              fullName: player.fullName,
              avatarUrl: player.avatarUrl,
              rating: player.baseRating,
              primaryPosition: player.positions.primary,
              isProvisional: stats.matches < 3,
              isLinked: player.isLinked,
              isActive: player.isActive,
              stats,
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-4xl leading-none font-extrabold tracking-wide uppercase">{player.nickname}</h1>
              {!player.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactivo</span>}
              {isMine && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Sos vos</span>}
            </div>
            {player.fullName && <p className="text-muted-foreground">{player.fullName}</p>}
            <dl className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Posiciones</dt>
                <dd className="flex gap-1.5">
                  {player.positions.primary ? <PositionBadge position={player.positions.primary} variant="long" /> : <span>—</span>}
                  {player.positions.secondary && <PositionBadge position={player.positions.secondary} variant="long" muted />}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Pierna hábil</dt>
                <dd className="flex h-6 items-center">{player.dominantFoot ? FOOT_LABELS[player.dominantFoot] : "—"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Cuenta</dt>
                <dd className="flex h-6 items-center gap-1.5">
                  {player.isLinked ? (
                    <>
                      <Link2 className="size-4 text-success" aria-hidden="true" />
                      {player.linkedName ?? "Vinculada"}
                    </>
                  ) : (
                    <>
                      <Link2Off className="size-4 text-muted-foreground" aria-hidden="true" />
                      Sin vincular
                    </>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {ctx.isAdmin ? (
            <PlayerAdminActions
              slug={slug}
              groupId={ctx.group.id}
              groupName={ctx.group.name}
              player={{
                id: player.id,
                nickname: player.nickname,
                isActive: player.isActive,
                isLinked: player.isLinked,
                matches: stats.matches,
              }}
            />
          ) : (
            isMine && (
              <Button variant="secondary" asChild>
                <Link href={routes.editPlayer(slug, player.id)}>
                  <Pencil aria-hidden="true" />
                  Editar mi ficha
                </Link>
              </Button>
            )
          )}

          <section aria-labelledby="stats-title" className="space-y-3">
            <h2 id="stats-title" className="font-display text-xl font-bold tracking-wide uppercase">
              Estadísticas
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Partidos" value={stats.matches} icon={Shirt} />
              <StatTile label="G · E · P" value={`${stats.wins}·${stats.draws}·${stats.losses}`} icon={Swords} />
              <StatTile label="Efectividad" value={winRate === null ? "—" : `${winRate}%`} icon={Percent} tone="success" />
              <StatTile label="Goles" value={stats.goals} icon={Goal} tone="primary" />
              <StatTile label="Asistencias" value={stats.assists} icon={HandHelping} />
              <StatTile label="MVP" value={stats.mvps} icon={Award} tone="gold" />
            </div>
            {stats.matches === 0 && (
              <p className="text-xs text-muted-foreground">Las estadísticas se completan solas a medida que se cargan resultados.</p>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="evolution-title" className="space-y-3">
        <h2 id="evolution-title" className="font-display text-xl font-bold tracking-wide uppercase">
          Evolución
        </h2>
        <EmptyState
          icon={LineChart}
          title="Sin historial todavía"
          description="El gráfico de evolución y la comparación con otros jugadores aparecen con los primeros partidos votados (Fase 3)."
        />
      </section>
    </div>
  );
}
