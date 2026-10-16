import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupContext } from "@/features/groups/queries";
import { ClaimPlayerList } from "@/features/players/components/claim-player-list";
import { CreateOwnPlayerForm } from "@/features/players/components/create-own-player-form";
import { listUnclaimedPlayers } from "@/features/players/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mi ficha" };

export default async function ClaimPlayerPage({ params }: PageProps<"/g/[slug]/mi-ficha">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (ctx.myPlayer) redirect(routes.player(slug, ctx.myPlayer.id));

  const [unclaimed, profile] = await Promise.all([listUnclaimedPlayers(ctx.group.id), getCurrentProfile()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow={ctx.group.name}
        title="Tu ficha de jugador"
        description="Vinculá tu cuenta a tu ficha para ver tus estadísticas y votar después de cada partido."
      />

      {unclaimed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold uppercase">¿Ya estás en el plantel?</CardTitle>
            <CardDescription>Si un admin te cargó antes, elegí tu nombre: conservás todo tu historial.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimPlayerList groupId={ctx.group.id} players={unclaimed} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold uppercase">
            {unclaimed.length > 0 ? "¿No aparecés? Creá tu ficha" : "Creá tu ficha"}
          </CardTitle>
          <CardDescription>Tu nivel inicial lo ajusta un admin; después se calcula solo con los partidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOwnPlayerForm groupId={ctx.group.id} defaultNickname={profile.displayName.split(" ")[0]} />
        </CardContent>
      </Card>
    </div>
  );
}
