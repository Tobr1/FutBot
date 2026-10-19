import { ChartLine, Trophy, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { ALL_SEASONS, resolveSeason } from "@/domain/stats/seasons";
import { getGroupContext } from "@/features/groups/queries";
import { GoalsTrendChart } from "@/features/stats/components/goals-trend-chart";
import { AttendanceList, PredictionAccuracyCard, ResultDistributionCard } from "@/features/stats/components/insight-cards";
import { DuoRankingList } from "@/features/stats/components/rivals-card";
import { StatsFilters } from "@/features/stats/components/stats-filters";
import { getGroupInsights, listSeasonsForStats } from "@/features/stats/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Análisis" };

export default async function AnalyticsPage({ params, searchParams }: PageProps<"/g/[slug]/analisis">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const ctx = await getGroupContext(slug);
  const seasons = await listSeasonsForStats(ctx.group.id);

  await connection();
  const today = todayIso(ctx.group.timezone, new Date());
  const selection = resolveSeason(seasons, query.temporada, today);
  // Duplas: el mínimo de partidos del grupo, con un piso de 3 para que una racha corta no la ponga primera.
  const duoMin = Math.max(3, ctx.group.ranking_min_matches);
  const data = await getGroupInsights(ctx.group.id, selection.range, { duoMinMatches: duoMin });

  const seasonLabel = selection.season?.name ?? "Histórico";
  const n = data.distribution.matches;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.groupRankings(slug)} backLabel="Rankings" title="Análisis" />
        <PageHeader
          title="Análisis"
          description={`${seasonLabel} · ${n} ${n === 1 ? "partido" : "partidos"}`}
          actions={
            <Button asChild variant="ghost" size="sm" className="max-sm:size-11 max-sm:px-0">
              <Link href={routes.groupAwards(slug)} transitionTypes={["nav-forward"]}>
                <Trophy aria-hidden="true" />
                <span className="max-sm:sr-only">Salón de la fama</span>
              </Link>
            </Button>
          }
        />

        <StatsFilters
          seasons={[...seasons.map((s) => ({ value: s.id, label: s.name })), { value: ALL_SEASONS, label: "Histórico" }]}
          season={selection.value}
        />

        {n === 0 ? (
          <EmptyState
            size="lg"
            icon={ChartLine}
            headingLevel="h2"
            title="Sin partidos jugados"
            description={
              selection.season
                ? "En esta temporada todavía no hay resultados. Probá con el histórico."
                : "Con los primeros resultados vas a ver tendencias, duplas y qué tan bien pronostica el sistema."
            }
          />
        ) : (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
            <div className="space-y-6">
              <section aria-labelledby="goles" className="space-y-1">
                <SectionHeader id="goles" title="Goles" />
                <GoalsTrendChart points={data.trend} />
              </section>

              <section aria-labelledby="resultados" className="space-y-1">
                <SectionHeader id="resultados" title="Resultados" />
                <ResultDistributionCard data={data.distribution} />
              </section>

              <section aria-labelledby="pronostico" className="space-y-1">
                <SectionHeader id="pronostico" title="Pronóstico del sistema" />
                {data.accuracy.decided === 0 ? (
                  <EmptyState size="sm" icon={ChartLine} tone="neutral" title="Sin partidos con favorito" description="Todos los partidos estaban parejos." />
                ) : (
                  <PredictionAccuracyCard data={data.accuracy} />
                )}
              </section>
            </div>

            <div className="space-y-6">
              <section aria-labelledby="duplas" className="space-y-1">
                <SectionHeader id="duplas" title="Duplas" count={`mín. ${duoMin} juntos`} />
                {data.duos.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={UsersRound}
                    tone="neutral"
                    title="Todavía no hay duplas"
                    description={`Aparecen cuando dos jugadores comparten equipo ${duoMin} veces o más.`}
                  />
                ) : (
                  <DuoRankingList duos={data.duos} players={data.players} compareHref={(a, b) => routes.comparePlayers(slug, a, b)} />
                )}
              </section>

              <section aria-labelledby="asistencia" className="space-y-1">
                <SectionHeader id="asistencia" title="Los que nunca faltan" />
                <AttendanceList entries={data.attendance} players={data.players} total={n} />
              </section>
            </div>
          </div>
        )}
      </div>
    </ScreenTransition>
  );
}
