import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { overall } from "@/domain/players/rating";
import { compareRows, headToHeadText } from "@/domain/stats/head-to-head";
import { getGroupContext } from "@/features/groups/queries";
import { listPlayers } from "@/features/players/queries";
import { ComparePicker, ComparePlayerList } from "@/features/stats/components/compare-picker";
import { CompareHeader, CompareTable, HeadToHeadCard } from "@/features/stats/components/compare-view";
import { getHeadToHead } from "@/features/stats/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Comparar" };

export default async function ComparePlayersPage({ params, searchParams }: PageProps<"/g/[slug]/jugadores/[playerId]/comparar">) {
  const [{ slug, playerId }, query] = await Promise.all([params, searchParams]);
  const ctx = await getGroupContext(slug);
  const roster = await listPlayers(ctx.group.id);
  const player = roster.find((p) => p.id === playerId);
  if (!player) notFound();

  const otherId = typeof query.con === "string" ? query.con : undefined;
  const other = otherId && otherId !== player.id ? roster.find((p) => p.id === otherId) : undefined;
  const options = roster
    .filter((p) => p.id !== player.id && (p.isActive || p.id === other?.id))
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
      rating: p.rating,
      href: routes.comparePlayers(slug, player.id, p.id),
    }));

  const playerHref = routes.player(slug, player.id);
  const h2h = other ? await getHeadToHead(ctx.group.id, player.id, other.id) : null;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={playerHref} backLabel={player.nickname} title="Comparar" />
        <PageHeader
          title="Comparar"
          description={other ? `${player.nickname} y ${other.nickname}, lado a lado.` : `Elegí con quién comparar a ${player.nickname}.`}
        />

        {!other || !h2h ? (
          options.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay otros jugadores activos para comparar.</p>
          ) : (
            <div className="max-w-xl">
              <ComparePlayerList options={options} />
            </div>
          )
        ) : (
          <>
            <div className="max-w-2xl space-y-3">
              <CompareHeader
                a={{ id: player.id, nickname: player.nickname, avatarUrl: player.avatarUrl, rating: player.rating, href: playerHref }}
                b={{
                  id: other.id,
                  nickname: other.nickname,
                  avatarUrl: other.avatarUrl,
                  rating: other.rating,
                  href: routes.player(slug, other.id),
                }}
              />
              <ComparePicker options={options} label="Cambiar jugador" className="w-full lg:w-auto" />
            </div>

            <section aria-labelledby="comparar-stats" className="max-w-2xl space-y-1">
              <SectionHeader id="comparar-stats" title="Estadísticas" />
              <CompareTable
                nameA={player.nickname}
                nameB={other.nickname}
                rows={compareRows(
                  { ...player.stats, overall: overall(player.rating) },
                  { ...other.stats, overall: overall(other.rating) },
                )}
              />
            </section>

            <section aria-labelledby="comparar-h2h" className="max-w-2xl space-y-1">
              <SectionHeader id="comparar-h2h" title="Cara a cara" />
              <HeadToHeadCard h2h={h2h} text={headToHeadText(h2h, player.nickname, other.nickname)} nameA={player.nickname} nameB={other.nickname} />
            </section>
          </>
        )}
      </div>
    </ScreenTransition>
  );
}
