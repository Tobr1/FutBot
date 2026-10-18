import { Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fab } from "@/components/layout/fab";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getGroupContext } from "@/features/groups/queries";
import { PlayersGrid } from "@/features/players/components/players-grid";
import { listPlayers } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Plantel" };

export default async function PlayersPage({ params }: PageProps<"/g/[slug]/jugadores">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const players = await listPlayers(ctx.group.id);
  const activeCount = players.filter((p) => p.isActive).length;

  return (
    <ScreenTransition>
      <div>
        <div className="space-y-6 lg:space-y-8">
          <PageHeader
            title="Plantel"
            description={
              players.length === 0 ? "Todavía sin jugadores" : `${activeCount} ${activeCount === 1 ? "activo" : "activos"}`
            }
            actions={
              ctx.isAdmin && (
                <Button asChild className="hidden lg:inline-flex">
                  <Link href={routes.newPlayer(slug)} transitionTypes={["nav-forward"]}>
                    <Plus aria-hidden="true" />
                    Agregar jugador
                  </Link>
                </Button>
              )
            }
          />

          {players.length === 0 ? (
            <EmptyState
              size="lg"
              icon={Users}
              headingLevel="h2"
              title="Todavía no hay jugadores"
              description={
                ctx.isAdmin
                  ? "Cargá a los que juegan siempre. No hace falta que tengan cuenta: después pueden vincular su ficha."
                  : "Cuando un admin cargue el plantel lo vas a ver acá."
              }
              action={
                ctx.isAdmin && (
                  <Button asChild size="lg">
                    <Link href={routes.newPlayer(slug)} transitionTypes={["nav-forward"]}>
                      <Plus aria-hidden="true" />
                      Cargar el primer jugador
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <PlayersGrid slug={slug} players={players} />
          )}
        </div>

        {/* Mobile: la acción principal flota sobre la barra inferior (en lg vive en el encabezado). */}
        {ctx.isAdmin && <Fab href={routes.newPlayer(slug)} icon={Plus} label="Agregar" />}
      </div>
    </ScreenTransition>
  );
}
