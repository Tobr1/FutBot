import {
  CalendarClock,
  CalendarPlus,
  CalendarRange,
  ClipboardCheck,
  FolderPlus,
  History,
  ListChecks,
  type LucideIcon,
  Settings2,
  Shield,
  UserPlus,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { LinkPending } from "@/components/shared/link-pending";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { formatMatchDate } from "@/domain/matches/datetime";
import { getGroupContext, getIsAppAdmin, listMembers } from "@/features/groups/queries";
import { listMatches } from "@/features/matches/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Administración" };

const FORWARD = ["nav-forward"];

const ICON_TONE = { muted: "text-muted-foreground", primary: "text-primary", warning: "text-warning" } as const;

function RowIcon({ icon: Icon, tone = "muted" }: { icon: LucideIcon; tone?: keyof typeof ICON_TONE }) {
  return <Icon className={cn("size-5", ICON_TONE[tone])} aria-hidden="true" />;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      transitionTypes={FORWARD}
      className="panel pressable relative flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="grid size-10 place-items-center rounded-full bg-primary/14 text-primary ring-1 ring-primary/25">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xs leading-tight font-semibold">{label}</span>
      <LinkPending />
    </Link>
  );
}

/**
 * Panel del administrador de FulBot: lo pendiente del grupo y todo lo que se
 * gestiona (partidos, plantel, invitaciones, ajustes). El resto de las
 * cuentas solo ve y vota, así que para ellas esta pantalla no existe.
 */
export default async function GroupAdminPage({ params }: PageProps<"/g/[slug]/admin">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) {
    return <AccessDenied backHref={routes.groupSettings(slug)} message="Esta sección es solo para el administrador de FulBot." />;
  }

  const [{ upcoming }, members, isAppAdmin] = await Promise.all([
    listMatches(ctx.group.id),
    listMembers(ctx.group.id),
    getIsAppAdmin(),
  ]);
  // "Falta el resultado" depende de la hora actual: recién después de connection().
  await connection();
  const now = new Date().getTime();
  const timeZone = ctx.group.timezone;

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <PageHeader eyebrow={ctx.group.name} title="Administración" />

        <div className="grid grid-cols-3 gap-2.5">
          <QuickAction href={routes.newMatch(slug)} icon={CalendarPlus} label="Nuevo partido" />
          <QuickAction href={routes.newPlayer(slug)} icon={UserRoundPlus} label="Agregar jugador" />
          <QuickAction href={routes.groupInvitations(slug)} icon={UserPlus} label="Invitar" />
        </div>

        <section aria-labelledby="admin-pendientes" className="space-y-1">
          <SectionHeader id="admin-pendientes" title="Pendientes" count={upcoming.length || undefined} />
          <ListGroup>
            {upcoming.length === 0 ? (
              <ListRow
                href={routes.newMatch(slug)}
                transitionTypes={FORWARD}
                leading={<RowIcon icon={ClipboardCheck} />}
                title="Todo al día"
                subtitle="No hay partidos abiertos. Armá el próximo cuando quieras."
                chevron
              />
            ) : (
              upcoming.map((match) => {
                const played = new Date(match.scheduledAt).getTime() < now;
                const needed = match.playersPerTeam * 2;
                return (
                  <ListRow
                    key={match.id}
                    href={played ? routes.matchResult(slug, match.id) : routes.match(slug, match.id)}
                    transitionTypes={FORWARD}
                    leading={<RowIcon icon={CalendarClock} tone={played ? "warning" : "primary"} />}
                    title={formatMatchDate(match.scheduledAt, timeZone)}
                    subtitle={
                      played
                        ? "Falta cargar el resultado"
                        : `${match.confirmed} de ${needed} confirmados${match.venue ? ` · ${match.venue}` : ""}`
                    }
                    chevron
                  />
                );
              })
            )}
          </ListGroup>
        </section>

        <section aria-labelledby="admin-gente" className="space-y-1">
          <SectionHeader id="admin-gente" title="Gente" />
          <ListGroup>
            <ListRow
              href={routes.groupPlayers(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={Users} />}
              title="Plantel"
              subtitle="Fichas, niveles y posiciones"
              chevron
            />
            <ListRow
              href={routes.groupMembers(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={Shield} />}
              title="Miembros"
              subtitle="Quiénes entran al grupo"
              trailing={<span className="text-sm text-muted-foreground tabular">{members.length}</span>}
              chevron
            />
            <ListRow
              href={routes.groupInvitations(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={UserPlus} />}
              title="Invitaciones"
              subtitle="Links activos y revocados"
              chevron
            />
          </ListGroup>
        </section>

        <section aria-labelledby="admin-grupo" className="space-y-1">
          <SectionHeader id="admin-grupo" title="Grupo" />
          <ListGroup>
            <ListRow
              href={routes.groupGeneralSettings(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={Settings2} />}
              title="Datos del grupo"
              subtitle="Nombre, formato y votación"
              chevron
            />
            <ListRow
              href={routes.groupTeamRules(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={ListChecks} />}
              title="Reglas de armado"
              subtitle="Parejas juntas o separadas al generar"
              chevron
            />
            <ListRow
              href={routes.groupSeasons(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={CalendarRange} />}
              title="Temporadas"
              chevron
            />
            <ListRow
              href={routes.groupAudit(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={History} />}
              title="Registro de cambios"
              subtitle="Resultados, correcciones y altas"
              chevron
            />
          </ListGroup>
        </section>

        {isAppAdmin && (
          <section aria-labelledby="admin-app" className="space-y-1">
            <SectionHeader id="admin-app" title="FulBot" />
            <ListGroup>
              <ListRow
                href={routes.newGroup}
                transitionTypes={FORWARD}
                leading={<RowIcon icon={FolderPlus} />}
                title="Crear otro grupo"
                chevron
              />
            </ListGroup>
          </section>
        )}
      </div>
    </ScreenTransition>
  );
}
