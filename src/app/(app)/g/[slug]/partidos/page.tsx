import { CalendarDays, CalendarPlus, ChevronRight, History, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { type CSSProperties, Suspense } from "react";
import { Fab } from "@/components/layout/fab";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getGroupContext } from "@/features/groups/queries";
import { MatchCard } from "@/features/matches/components/match-card";
import { MatchLists } from "@/features/matches/components/match-lists";
import { listMatches, type MatchListItem } from "@/features/matches/queries";
import { todayIso } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Partidos" };

const FLASH = { eliminado: { "1": "Partido eliminado." } };

export default async function MatchesPage({ params }: PageProps<"/g/[slug]/partidos">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const { upcoming, past, pastTotal } = await listMatches(ctx.group.id);

  // La hora actual solo después de connection(): la página es dinámica.
  await connection();
  const now = new Date();
  const timeZone = ctx.group.timezone;
  const today = todayIso(timeZone, now);

  const list = (items: MatchListItem[]) => (
    <ul className="grid gap-2 lg:grid-cols-2 lg:gap-3">
      {items.map((match, index) => (
        <li key={match.id} className="animate-rise [animation-delay:calc(min(var(--i),8)*35ms)]" style={{ "--i": index } as CSSProperties}>
          <MatchCard
            href={routes.match(slug, match.id)}
            match={match}
            timeZone={timeZone}
            today={today}
            nowMs={now.getTime()}
          />
        </li>
      ))}
    </ul>
  );

  const newMatchButton = ctx.isAdmin && (
    <Button asChild size="lg">
      <Link href={routes.newMatch(slug)} transitionTypes={["nav-forward"]}>
        <CalendarPlus aria-hidden="true" />
        Crear partido
      </Link>
    </Button>
  );

  const total = upcoming.length + pastTotal;

  return (
    <ScreenTransition>
      <Suspense fallback={null}>
        <FlashToast messages={FLASH} />
      </Suspense>
      <div>
        <div className="space-y-6 lg:space-y-8">
          <PageHeader
            title="Partidos"
            description={
              total === 0
                ? "Todavía sin partidos"
                : `${upcoming.length} ${upcoming.length === 1 ? "próximo" : "próximos"} · ${pastTotal} ${pastTotal === 1 ? "jugado" : "jugados"}`
            }
            actions={
              ctx.isAdmin && (
                <Button asChild className="hidden lg:inline-flex">
                  <Link href={routes.newMatch(slug)} transitionTypes={["nav-forward"]}>
                    <Plus aria-hidden="true" />
                    Nuevo partido
                  </Link>
                </Button>
              )
            }
          />

          {total === 0 ? (
            <EmptyState
              size="lg"
              icon={CalendarDays}
              headingLevel="h2"
              title="Todavía no hay partidos"
              description={
                ctx.isAdmin
                  ? "Creá el primero: elegí fecha y cancha, y pegá la lista de WhatsApp para convocar."
                  : "Cuando un admin cree un partido lo vas a ver acá."
              }
              action={newMatchButton}
            />
          ) : (
            <MatchLists
              upcomingCount={upcoming.length}
              pastCount={pastTotal}
              upcoming={
                upcoming.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={CalendarDays}
                    title="Sin partidos programados"
                    description={ctx.isAdmin ? "Armá el próximo cuando quieras." : "Todavía no hay fecha para el próximo."}
                  />
                ) : (
                  list(upcoming)
                )
              }
              past={
                past.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={History}
                    title="Todavía no se jugó ninguno"
                    description="Los resultados van a quedar acá."
                  />
                ) : (
                  <div className="space-y-3">
                    {list(past)}
                    <Button asChild variant="secondary" size="lg" className="w-full lg:w-auto">
                      <Link href={routes.groupHistory(slug)} transitionTypes={["nav-forward"]}>
                        <History aria-hidden="true" />
                        {pastTotal > past.length ? `Ver historial completo (${pastTotal})` : "Ver historial"}
                        <ChevronRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                )
              }
            />
          )}
        </div>

        {ctx.isAdmin && <Fab href={routes.newMatch(slug)} icon={Plus} label="Nuevo partido" />}
      </div>
    </ScreenTransition>
  );
}
