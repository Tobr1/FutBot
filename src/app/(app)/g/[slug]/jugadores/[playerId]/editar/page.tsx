import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupContext } from "@/features/groups/queries";
import { OwnPlayerForm } from "@/features/players/components/own-player-form";
import { PlayerForm } from "@/features/players/components/player-form";
import { getPlayer } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Editar jugador" };

export default async function EditPlayerPage({ params }: PageProps<"/g/[slug]/jugadores/[playerId]/editar">) {
  const { slug, playerId } = await params;
  const ctx = await getGroupContext(slug);
  const player = await getPlayer(ctx.group.id, playerId);
  if (!player) notFound();

  const isMine = ctx.myPlayer?.id === player.id;
  if (!ctx.isAdmin && !isMine) return <AccessDenied backHref={routes.player(slug, player.id)} />;

  return (
    <div className="space-y-6">
      <Link
        href={routes.player(slug, player.id)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {player.nickname}
      </Link>
      <PageHeader eyebrow="Plantel" title={ctx.isAdmin ? `Editar a ${player.nickname}` : "Editar mi ficha"} />
      <Card>
        <CardContent>
          {ctx.isAdmin ? (
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
          ) : (
            <OwnPlayerForm
              groupId={ctx.group.id}
              player={{
                id: player.id,
                fullName: player.fullName ?? "",
                primaryPosition: player.positions.primary ?? "",
                secondaryPosition: player.positions.secondary ?? "",
                dominantFoot: player.dominantFoot ?? "",
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
