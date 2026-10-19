import { History, LineChart, Link2, Link2Off, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PositionBadge } from "@/components/shared/position-badge";
import { RecordBar } from "@/components/shared/record-bar";
import { SectionHeader } from "@/components/shared/section-header";
import { StatStrip } from "@/components/shared/stat-strip";
import { Button } from "@/components/ui/button";
import { FOOT_LABELS } from "@/domain/players/positions";
import { effectiveness } from "@/domain/players/stats";
import { getGroupContext } from "@/features/groups/queries";
import { PlayerAdminMenu } from "@/features/players/components/player-admin-actions";
import { PlayerHero } from "@/features/players/components/player-hero";
import { getPlayer, listPlayers } from "@/features/players/queries";
import { ComparePicker } from "@/features/stats/components/compare-picker";
import { EvolutionChart } from "@/features/stats/components/evolution-chart";
import { RecentMatches } from "@/features/stats/components/recent-matches";
import { getPlayerEvolution, getRecentMatches } from "@/features/stats/queries";
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

  const [evolution, recent, roster] = await Promise.all([
    getPlayerEvolution(ctx.group.id, player.id),
    getRecentMatches(ctx.group.id, player.id, 5),
    listPlayers(ctx.group.id),
  ]);
  const compareOptions = roster
    .filter((p) => p.id !== player.id && p.isActive)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      rating: p.rating,
      href: routes.comparePlayers(slug, player.id, p.id),
    }));

  const isMine = ctx.myPlayer?.id === player.id;
  const { stats } = player;
  const winRate = effectiveness(stats);

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader
          backHref={routes.groupPlayers(slug)}
          backLabel="Plantel"
          title={player.nickname}
          actions={
            <>
              {(ctx.isAdmin || isMine) && (
                <Button asChild variant="ghost" size="icon">
                  <Link href={routes.editPlayer(slug, player.id)} transitionTypes={["nav-forward"]} aria-label="Editar">
                    <Pencil className="size-5" aria-hidden="true" />
                  </Link>
                </Button>
              )}
              {ctx.isAdmin && (
                <PlayerAdminMenu
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
              )}
            </>
          }
        />

        <PlayerHero player={player} isMine={isMine} isAdmin={ctx.isAdmin} />

        <section aria-label="Estadísticas" className="space-y-4">
          <StatStrip
            items={[
              { label: "PJ", srLabel: "Partidos jugados", value: stats.matches },
              { label: "Goles", value: stats.goals, tone: "primary" },
              { label: "Asist.", srLabel: "Asistencias", value: stats.assists },
              { label: "MVP", value: stats.mvps, tone: "gold" },
              {
                label: "%Vic",
                srLabel: "Efectividad",
                value: winRate === null ? "—" : `${winRate}%`,
                tone: winRate === null ? "default" : "success",
              },
            ]}
          />
          <RecordBar wins={stats.wins} draws={stats.draws} losses={stats.losses} />
          {compareOptions.length > 0 && <ComparePicker options={compareOptions} className="w-full lg:w-auto" />}
        </section>

        <section aria-labelledby="evolucion" className="space-y-3">
          <SectionHeader title="Evolución" id="evolucion" />
          {evolution.length === 0 ? (
            <EmptyState
              size="sm"
              icon={LineChart}
              tone="neutral"
              title="Sin partidos todavía"
              description={`Después de cada partido vas a ver cómo cambia ${isMine ? "tu" : "su"} valoración.`}
            />
          ) : (
            <EvolutionChart points={evolution} />
          )}
        </section>

        <section aria-labelledby="ultimos" className="space-y-3">
          <SectionHeader title="Últimos partidos" id="ultimos" />
          {recent.length === 0 ? (
            <EmptyState size="sm" icon={History} tone="neutral" title="Todavía no jugó" description="Los resultados van a aparecer acá." />
          ) : (
            <RecentMatches matches={recent} timeZone={ctx.group.timezone} matchHref={(id) => routes.match(slug, id)} />
          )}
        </section>

        <section aria-labelledby="detalles" className="space-y-3">
          <SectionHeader title="Detalles" id="detalles" />
          <ListGroup>
            <ListRow
              title="Posiciones"
              trailing={
                player.positions.primary ? (
                  <>
                    <PositionBadge position={player.positions.primary} variant="long" />
                    {player.positions.secondary && (
                      <PositionBadge position={player.positions.secondary} variant="long" muted />
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )
              }
            />
            <ListRow
              title="Pierna hábil"
              trailing={
                <span className="text-sm text-muted-foreground">
                  {player.dominantFoot ? FOOT_LABELS[player.dominantFoot] : "—"}
                </span>
              }
            />
            <ListRow
              title="Cuenta"
              trailing={
                player.isLinked ? (
                  <span className="flex max-w-[45vw] items-center gap-1.5 text-sm lg:max-w-xs">
                    <Link2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                    <span className="truncate">{player.linkedName ?? "Vinculada"}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link2Off className="size-4 shrink-0" aria-hidden="true" />
                    Sin vincular
                  </span>
                )
              }
            />
          </ListGroup>
        </section>
      </div>
    </ScreenTransition>
  );
}
