import { CalendarRange } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <SettingsShell ctx={ctx} title="Temporadas" description="Los rankings se pueden filtrar por temporada. Cada partido pertenece a la temporada de su fecha.">
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/70">
        {seasons.map((season) => {
          const isCurrent = season.starts_on <= today && (!season.ends_on || season.ends_on >= today);
          return (
            <li key={season.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <CalendarRange className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{season.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatIsoDate(season.starts_on)} → {season.ends_on ? formatIsoDate(season.ends_on) : "en curso"}
                </p>
              </div>
              {isCurrent && <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Actual</span>}
            </li>
          );
        })}
      </ul>

      {ctx.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold uppercase">Nueva temporada</CardTitle>
            <CardDescription>Útil para cortar rankings por torneo o por año.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewSeasonForm groupId={ctx.group.id} defaultStart={today} />
          </CardContent>
        </Card>
      )}
    </SettingsShell>
  );
}
