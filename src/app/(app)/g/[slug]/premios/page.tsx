import { ChartLine, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { latestAwards } from "@/domain/awards";
import { AwardFeed, MonthAwardsList } from "@/features/awards/components/award-lists";
import { RecordsList } from "@/features/awards/components/records-list";
import { getGroupAwards } from "@/features/awards/queries";
import { getGroupContext } from "@/features/groups/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Salón de la fama" };

export default async function AwardsPage({ params }: PageProps<"/g/[slug]/premios">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  // "Hoy" cierra meses y temporadas: solo después de connection().
  await connection();
  const today = todayIso(ctx.group.timezone, new Date());
  const data = await getGroupAwards(ctx.group.id, { today, minMatches: ctx.group.ranking_min_matches });

  const playerHref = (id: string) => routes.player(slug, id);
  const matchHref = (id: string) => routes.match(slug, id);
  const recent = latestAwards(data.awards, 10);
  const hasRecords = data.records.players.length > 0 || data.records.matches.length > 0;
  const isEmpty = data.awards.length === 0 && !hasRecords;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.groupRankings(slug)} backLabel="Rankings" title="Salón de la fama" />
        <PageHeader
          title="Salón de la fama"
          description={
            isEmpty
              ? "Premios del mes, récords y logros del grupo."
              : `${data.awards.length} ${data.awards.length === 1 ? "logro" : "logros"} · ${data.months.length} ${data.months.length === 1 ? "mes premiado" : "meses premiados"}`
          }
          actions={
            <Button asChild variant="ghost" size="sm" className="max-sm:size-11 max-sm:px-0">
              <Link href={routes.groupAnalytics(slug)} transitionTypes={["nav-forward"]}>
                <ChartLine aria-hidden="true" />
                <span className="max-sm:sr-only">Análisis</span>
              </Link>
            </Button>
          }
        />

        {isEmpty ? (
          <EmptyState
            size="lg"
            icon={Trophy}
            tone="gold"
            headingLevel="h2"
            title="Todavía no hay premios"
            description="Con los primeros resultados aparecen los logros: hat-tricks, rachas, MVP y los premios de cada mes."
          />
        ) : (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
            <div className="space-y-6">
              <section aria-labelledby="premios-del-mes" className="space-y-1">
                <SectionHeader id="premios-del-mes" title="Premios del mes" />
                {data.months.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={Trophy}
                    tone="gold"
                    title="Ningún mes cerrado todavía"
                    description="El goleador y el MVP del mes se eligen cuando termina el mes."
                  />
                ) : (
                  <MonthAwardsList months={data.months} players={data.players} playerHref={playerHref} />
                )}
              </section>

              {hasRecords && (
                <section aria-labelledby="records" className="space-y-1">
                  <SectionHeader id="records" title="Récords" />
                  <RecordsList
                    records={data.records}
                    players={data.players}
                    playerHref={playerHref}
                    matchHref={matchHref}
                    timeZone={ctx.group.timezone}
                  />
                </section>
              )}
            </div>

            {recent.length > 0 && (
              <section aria-labelledby="ultimos-logros" className="space-y-1">
                <SectionHeader id="ultimos-logros" title="Últimos logros" />
                <AwardFeed awards={recent} players={data.players} playerHref={playerHref} timeZone={ctx.group.timezone} label="Últimos logros" />
              </section>
            )}
          </div>
        )}
      </div>
    </ScreenTransition>
  );
}
