import { Target } from "lucide-react";
import type { Metadata } from "next";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { POINTS_EXACT, POINTS_OUTCOME } from "@/domain/predictions/member";
import { getGroupContext } from "@/features/groups/queries";
import { getPredictionStandings } from "@/features/predictions/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pronosticadores" };

const RANK_COLORS: Record<number, string> = { 1: "text-medal-1", 2: "text-medal-2", 3: "text-medal-3" };

/** Tabla de pronosticadores del grupo: puntos sumados en los partidos ya jugados. */
export default async function PredictionStandingsPage({ params }: PageProps<"/g/[slug]/pronosticos">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const standings = await getPredictionStandings(ctx.group.id);

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <StackHeader backHref={routes.groupRankings(slug)} backLabel="Rankings" title="Pronosticadores" />
        <PageHeader
          title="Pronosticadores"
          description={`${POINTS_EXACT} puntos por el resultado exacto y ${POINTS_OUTCOME} por acertar quién gana. Se pronostica en cada partido, hasta que empieza.`}
        />
        {standings.length === 0 ? (
          <EmptyState
            size="lg"
            icon={Target}
            scene="partidos"
            headingLevel="h2"
            title="Todavía no hay puntos"
            description="Pronosticá el próximo partido desde su pantalla: los puntos aparecen cuando se carga el resultado."
          />
        ) : (
          <ListGroup ordered label="Pronosticadores">
            {standings.map((s, index) => (
              <ListRow
                key={s.profileId}
                leading={
                  <span className="flex items-center gap-3">
                    <span className={cn("w-5 text-center font-display text-lg font-extrabold tabular", RANK_COLORS[index + 1] ?? "text-muted-foreground")}>
                      {index + 1}
                    </span>
                    <UserAvatar name={s.name} src={s.avatarUrl} size="md" />
                  </span>
                }
                title={
                  <>
                    {s.name}
                    {s.profileId === ctx.userId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(vos)</span>}
                  </>
                }
                subtitle={`${s.exact === 1 ? "1 exacto" : `${s.exact} exactos`} · ${s.played === 1 ? "1 partido" : `${s.played} partidos`}`}
                trailing={
                  <span className="font-display text-2xl font-extrabold tabular">
                    {s.points}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">pts</span>
                  </span>
                }
              />
            ))}
          </ListGroup>
        )}
      </div>
    </ScreenTransition>
  );
}
