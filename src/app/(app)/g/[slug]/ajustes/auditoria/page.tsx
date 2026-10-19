import {
  CalendarDays,
  CalendarRange,
  History,
  Link2,
  type LucideIcon,
  Settings2,
  Shuffle,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AccessDenied } from "@/components/shared/access-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { type AuditCategory, describeAudit } from "@/domain/audit/describe";
import { formatMatchDate, formatStamp } from "@/domain/matches/datetime";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext } from "@/features/groups/queries";
import { listAuditLogs } from "@/features/matches/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Registro de cambios" };

const LIMIT = 100;

const ICONS: Record<AuditCategory, { icon: LucideIcon; tone: string }> = {
  match: { icon: CalendarDays, tone: "bg-primary/12 text-primary ring-primary/25" },
  result: { icon: Trophy, tone: "bg-success/12 text-success ring-success/25" },
  teams: { icon: Shuffle, tone: "bg-primary/12 text-primary ring-primary/25" },
  player: { icon: UserRound, tone: "bg-surface-3 text-muted-foreground ring-hairline" },
  member: { icon: Users, tone: "bg-surface-3 text-muted-foreground ring-hairline" },
  group: { icon: Settings2, tone: "bg-surface-3 text-muted-foreground ring-hairline" },
  season: { icon: CalendarRange, tone: "bg-surface-3 text-muted-foreground ring-hairline" },
  invite: { icon: Link2, tone: "bg-surface-3 text-muted-foreground ring-hairline" },
  other: { icon: History, tone: "bg-surface-3 text-muted-foreground ring-hairline" },
};

export default async function AuditPage({ params }: PageProps<"/g/[slug]/ajustes/auditoria">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.groupSettings(slug)} />;

  const { entries, matchDates, profileNames } = await listAuditLogs(ctx.group.id, LIMIT);
  await connection();
  const now = new Date();
  const timeZone = ctx.group.timezone;

  const rows = entries.flatMap((entry) => {
    const description = describeAudit(entry, {
      formatDay: (iso) => formatMatchDate(iso, timeZone),
      matchScheduledAt: (id) => matchDates[id] ?? null,
      profileName: (id) => profileNames[id] ?? null,
    });
    return description ? [{ entry, description }] : [];
  });

  return (
    <SettingsShell slug={slug} title="Registro de cambios" description="Quién cambió qué en el grupo. Solo lo ven los admins.">
      {rows.length === 0 ? (
        <EmptyState icon={History} headingLevel="h2" title="Sin cambios todavía" description="Acá vas a ver resultados, correcciones y altas." />
      ) : (
        <div className="space-y-2">
          <ol className="list-group" aria-label="Cambios recientes">
            {rows.map(({ entry, description }) => {
              const { icon: Icon, tone } = ICONS[description.category];
              return (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-inset", tone)}>
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      <span className="font-semibold">{entry.actorName ?? "Alguien"}</span> {description.text}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular">
                      <time dateTime={entry.createdAt}>{formatStamp(entry.createdAt, timeZone, now)}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {entries.length >= LIMIT && (
            <p className="px-1 text-xs text-muted-foreground">Se muestran los últimos {LIMIT} cambios.</p>
          )}
        </div>
      )}
    </SettingsShell>
  );
}
