import { CalendarRange, IdCard, LayoutGrid, LogOut, Settings2, UserPlus, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";
import { PlayerRow } from "@/components/shared/player-row";
import { SectionHeader } from "@/components/shared/section-header";
import { signOutAction } from "@/features/auth/actions";
import { LeaveGroupButton } from "@/features/groups/components/leave-group-button";
import { getGroupContext, listMembers, listSeasons } from "@/features/groups/queries";
import { getPlayer } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Más" };

const FORWARD = ["nav-forward"];
const SIGN_OUT_FORM_ID = "sign-out-form";

function RowIcon({ icon: Icon, tone = "muted" }: { icon: typeof Users; tone?: "muted" | "primary" }) {
  return <Icon className={tone === "primary" ? "size-5 text-primary" : "size-5 text-muted-foreground"} aria-hidden="true" />;
}

export default async function GroupMorePage({ params }: PageProps<"/g/[slug]/ajustes">) {
  const { slug } = await params;
  const { group, isAdmin, myPlayer } = await getGroupContext(slug);
  const [members, seasons, player] = await Promise.all([
    listMembers(group.id),
    listSeasons(group.id),
    myPlayer ? getPlayer(group.id, myPlayer.id) : null,
  ]);
  // Sin Date: la temporada abierta (sin cierre) o la más reciente.
  const currentSeason = seasons.find((s) => !s.ends_on) ?? seasons[0];

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <PageHeader title="Más" />

        <section aria-labelledby="mas-ficha" className="space-y-2">
          <h2
            id="mas-ficha"
            className={player ? "px-1 text-2xs font-semibold tracking-[0.12em] text-primary uppercase" : "sr-only"}
          >
            Tu ficha
          </h2>
          <ListGroup>
            {player ? (
              <PlayerRow
                href={routes.player(slug, player.id)}
                transitionTypes={FORWARD}
                player={{
                  nickname: player.nickname,
                  fullName: player.fullName,
                  avatarUrl: player.avatarUrl,
                  rating: player.baseRating,
                  primaryPosition: player.positions.primary,
                  isActive: player.isActive,
                  stats: player.stats,
                }}
              />
            ) : (
              <ListRow
                href={routes.claimPlayer(slug)}
                transitionTypes={FORWARD}
                leading={
                  <span className="grid size-10 place-items-center rounded-full bg-primary/14 text-primary ring-1 ring-primary/25">
                    <IdCard className="size-5" aria-hidden="true" />
                  </span>
                }
                title="Vinculá tu ficha"
                subtitle="Elegí tu nombre en el plantel"
                chevron
              />
            )}
          </ListGroup>
        </section>

        <section aria-labelledby="mas-grupo" className="space-y-1">
          <SectionHeader id="mas-grupo" title="Grupo" />
          <ListGroup>
            {isAdmin && (
              <ListRow
                href={routes.groupInvitations(slug)}
                transitionTypes={FORWARD}
                leading={<RowIcon icon={UserPlus} tone="primary" />}
                title="Invitar amigos"
                subtitle="Mandá el link por WhatsApp"
                chevron
              />
            )}
            <ListRow
              href={routes.groupMembers(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={Users} />}
              title="Miembros"
              trailing={<span className="text-sm text-muted-foreground tabular">{members.length}</span>}
              chevron
            />
            <ListRow
              href={routes.groupSeasons(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={CalendarRange} />}
              title="Temporadas"
              trailing={
                currentSeason ? (
                  <span className="max-w-32 truncate text-sm text-muted-foreground">{currentSeason.name}</span>
                ) : undefined
              }
              chevron
            />
            <ListRow
              href={routes.groupGeneralSettings(slug)}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={Settings2} />}
              title="Datos del grupo"
              subtitle={isAdmin ? "Nombre, formato y reglas" : "Solo lectura"}
              chevron
            />
          </ListGroup>
        </section>

        <section aria-labelledby="mas-cuenta" className="space-y-1">
          <SectionHeader id="mas-cuenta" title="Cuenta" />
          <form id={SIGN_OUT_FORM_ID} action={signOutAction} hidden />
          <ListGroup>
            <ListRow
              href={routes.profile}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={UserRound} />}
              title="Mi perfil"
              chevron
            />
            <ListRow
              href={routes.dashboard}
              transitionTypes={FORWARD}
              leading={<RowIcon icon={LayoutGrid} />}
              title="Mis grupos"
              chevron
            />
            <ListRow asChild leading={<RowIcon icon={LogOut} />} title="Cerrar sesión">
              <button type="submit" form={SIGN_OUT_FORM_ID} />
            </ListRow>
          </ListGroup>
        </section>

        <ListGroup label="Salir del grupo">
          <LeaveGroupButton variant="row" groupId={group.id} groupName={group.name} />
        </ListGroup>
      </div>
    </ScreenTransition>
  );
}
