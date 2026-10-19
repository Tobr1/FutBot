import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { HISTORY_MAX_PAGES, HISTORY_PAGE_SIZE, parsePage } from "@/domain/stats/history";
import { ALL_SEASONS, resolveSeason } from "@/domain/stats/seasons";
import { getGroupContext } from "@/features/groups/queries";
import { HistoryList } from "@/features/stats/components/history-list";
import { StatsFilters } from "@/features/stats/components/stats-filters";
import { listMatchHistory, listSeasonsForStats } from "@/features/stats/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage({ params, searchParams }: PageProps<"/g/[slug]/historial">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const ctx = await getGroupContext(slug);
  const seasons = await listSeasonsForStats(ctx.group.id);

  await connection();
  const today = todayIso(ctx.group.timezone, new Date());
  // Por defecto, todo el historial; la temporada es un filtro opcional.
  const selection = resolveSeason(seasons, query.temporada ?? ALL_SEASONS, today);
  const page = parsePage(query.page);
  const { items, total } = await listMatchHistory(ctx.group.id, { range: selection.range, limit: page * HISTORY_PAGE_SIZE });

  const hasMore = items.length < total && page < HISTORY_MAX_PAGES;
  const nextParams = new URLSearchParams();
  if (selection.value !== ALL_SEASONS) nextParams.set("temporada", selection.value);
  nextParams.set("page", String(page + 1));

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.groupMatches(slug)} backLabel="Partidos" title="Historial" />
        <PageHeader
          title="Historial"
          description={`${total} ${total === 1 ? "partido jugado" : "partidos jugados"}${selection.season ? ` en ${selection.season.name}` : ""}`}
        />

        {seasons.length > 0 && (
          <StatsFilters
            seasons={[{ value: ALL_SEASONS, label: "Todas las temporadas" }, ...seasons.map((s) => ({ value: s.id, label: s.name }))]}
            season={selection.value}
          />
        )}

        {items.length === 0 ? (
          <EmptyState
            size="lg"
            icon={History}
            headingLevel="h2"
            title="Todavía no hay partidos jugados"
            description={selection.season ? "No hay resultados en esta temporada." : "Cuando se cargue el primer resultado va a aparecer acá."}
          />
        ) : (
          <>
            <HistoryList matches={items} timeZone={ctx.group.timezone} matchHref={(id) => routes.match(slug, id)} />
            {hasMore ? (
              <Button asChild variant="secondary" size="lg" className="w-full lg:w-auto">
                <Link href={`?${nextParams.toString()}`} scroll={false} replace>
                  Ver más ({total - items.length} {total - items.length === 1 ? "restante" : "restantes"})
                </Link>
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground lg:text-left">
                {items.length < total ? `Mostrando los últimos ${items.length}.` : "No hay más partidos."}
              </p>
            )}
          </>
        )}
      </div>
    </ScreenTransition>
  );
}
