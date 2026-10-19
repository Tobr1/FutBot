import { History, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { parseMinMatches } from "@/domain/stats/rankings-view";
import { ALL_SEASONS, resolveSeason } from "@/domain/stats/seasons";
import { getGroupContext } from "@/features/groups/queries";
import { RankingsView } from "@/features/stats/components/rankings-view";
import { StatsFilters } from "@/features/stats/components/stats-filters";
import { getRankings, listSeasonsForStats } from "@/features/stats/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Rankings" };

const MIN_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];

export default async function RankingsPage({ params, searchParams }: PageProps<"/g/[slug]/rankings">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const ctx = await getGroupContext(slug);
  const seasons = await listSeasonsForStats(ctx.group.id);

  // "Hoy" (para la temporada actual) solo después de connection().
  await connection();
  const today = todayIso(ctx.group.timezone, new Date());
  const selection = resolveSeason(seasons, query.temporada, today);
  const minMatches = parseMinMatches(query.min, ctx.group.ranking_min_matches);
  const data = await getRankings(ctx.group.id, selection.season?.id ?? null, minMatches);

  const seasonLabel = selection.season?.name ?? "Histórico";
  const minOptions = [...new Set([...MIN_OPTIONS, minMatches, ctx.group.ranking_min_matches])].sort((a, b) => a - b);
  const players = Object.fromEntries(
    Object.values(data.players).map((p) => [p.id, { nickname: p.nickname, avatarUrl: p.avatarUrl, primaryPosition: p.primaryPosition }]),
  );

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <PageHeader
          title="Rankings"
          description={`${seasonLabel} · ${data.matchCount} ${data.matchCount === 1 ? "partido" : "partidos"}`}
          actions={
            <Button asChild variant="ghost" size="sm" className="max-sm:size-11 max-sm:px-0">
              <Link href={routes.groupHistory(slug)} transitionTypes={["nav-forward"]}>
                <History aria-hidden="true" />
                <span className="max-sm:sr-only">Historial</span>
              </Link>
            </Button>
          }
        />

        <StatsFilters
          seasons={[
            ...seasons.map((s) => ({ value: s.id, label: s.name })),
            { value: ALL_SEASONS, label: "Histórico" },
          ]}
          season={selection.value}
          minMatches={minMatches}
          minOptions={minOptions}
        />

        {data.matchCount === 0 ? (
          <EmptyState
            size="lg"
            icon={Trophy}
            tone="gold"
            headingLevel="h2"
            title="Sin partidos jugados"
            description={
              selection.season
                ? "En esta temporada todavía no hay resultados. Probá con el histórico."
                : "Cuando se carguen resultados, acá van a aparecer los mejores del grupo."
            }
          />
        ) : (
          <RankingsView
            rankings={data.rankings}
            players={players}
            minMatches={minMatches}
            initialSlug={typeof query.ranking === "string" ? query.ranking : undefined}
            playerHrefBase={routes.groupPlayers(slug)}
          />
        )}
      </div>
    </ScreenTransition>
  );
}
