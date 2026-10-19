import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { getGroupContext } from "@/features/groups/queries";
import { PlayerForm } from "@/features/players/components/player-form";
import { getPlayer } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Editar jugador" };

export default async function EditPlayerPage({ params }: PageProps<"/g/[slug]/jugadores/[playerId]/editar">) {
  const { slug, playerId } = await params;
  const ctx = await getGroupContext(slug);
  const player = await getPlayer(ctx.group.id, playerId);
  if (!player) notFound();

  // Los jugadores solo ven y votan: las fichas las edita el administrador.
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.player(slug, player.id)} />;

  const title = `Editar a ${player.nickname}`;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.player(slug, player.id)} backLabel={player.nickname} title={title} />
        <PageHeader title={title} />
        {/* Sin Card: su overflow-hidden rompería la barra de acciones pegajosa en el teléfono. */}
        <div className="lg:panel lg:rounded-xl lg:p-6">
          <PlayerForm
            groupId={ctx.group.id}
            defaults={{
              id: player.id,
              nickname: player.nickname,
              fullName: player.fullName ?? "",
              baseRating: player.baseRating,
              primaryPosition: player.positions.primary ?? "",
              secondaryPosition: player.positions.secondary ?? "",
              dominantFoot: player.dominantFoot ?? "",
            }}
          />
        </div>
      </div>
    </ScreenTransition>
  );
}
