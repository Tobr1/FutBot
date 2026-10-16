import { Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={ctx.group.name}
        title="Plantel"
        description={`${activeCount} ${activeCount === 1 ? "jugador activo" : "jugadores activos"}. Las fichas sin cuenta también suman estadísticas.`}
        actions={
          ctx.isAdmin && (
            <Button asChild>
              <Link href={routes.newPlayer(slug)}>
                <Plus aria-hidden="true" />
                Agregar jugador
              </Link>
            </Button>
          )
        }
      />

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay jugadores"
          description={
            ctx.isAdmin
              ? "Cargá a los que juegan habitualmente. No hace falta que tengan cuenta: después pueden vincular su ficha."
              : "Cuando un admin cargue el plantel lo vas a ver acá."
          }
          action={
            ctx.isAdmin && (
              <Button asChild size="lg">
                <Link href={routes.newPlayer(slug)}>
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
  );
}
