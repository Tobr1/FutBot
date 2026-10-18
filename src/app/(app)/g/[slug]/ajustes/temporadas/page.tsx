import { CalendarRange } from "lucide-react";
import type { Metadata } from "next";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { NewSeasonForm } from "@/features/groups/components/new-season-form";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext, listSeasons } from "@/features/groups/queries";
import { formatIsoDate, todayIso } from "@/lib/format";

export const metadata: Metadata = { title: "Temporadas" };

export default async function SeasonsPage({ params }: PageProps<"/g/[slug]/ajustes/temporadas">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const seasons = await listSeasons(ctx.group.id);
  const today = todayIso(ctx.group.timezone);

  return (
    <SettingsShell slug={slug} title="Temporadas" description="Los rankings se filtran por temporada.">
      <ListGroup label="Temporadas">
        {seasons.map((season) => {
          const isCurrent = season.starts_on <= today && (!season.ends_on || season.ends_on >= today);
          return (
            <ListRow
              key={season.id}
              leading={
                <span
                  className={
                    isCurrent
                      ? "grid size-9 place-items-center rounded-lg bg-primary/14 text-primary"
                      : "grid size-9 place-items-center rounded-lg bg-surface-3 text-muted-foreground"
                  }
                >
                  <CalendarRange className="size-4" aria-hidden="true" />
                </span>
              }
              title={season.name}
              subtitle={`${formatIsoDate(season.starts_on)} → ${season.ends_on ? formatIsoDate(season.ends_on) : "en curso"}`}
              trailing={
                isCurrent ? (
                  <Badge tone="primary" size="sm">
                    Actual
                  </Badge>
                ) : undefined
              }
            />
          );
        })}
      </ListGroup>

      {ctx.isAdmin && (
        <section aria-labelledby="nueva-temporada" className="space-y-3 lg:panel lg:rounded-xl lg:p-6">
          <div>
            <SectionHeader id="nueva-temporada" title="Nueva temporada" />
            <p className="text-sm text-muted-foreground">Útil para cortar rankings por torneo o por año.</p>
          </div>
          <NewSeasonForm groupId={ctx.group.id} defaultStart={today} />
        </section>
      )}
    </SettingsShell>
  );
}
