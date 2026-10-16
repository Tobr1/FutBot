import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/shared/access-denied";
import { FlashToast } from "@/components/shared/flash-toast";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupContext } from "@/features/groups/queries";
import { PlayerForm } from "@/features/players/components/player-form";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Nuevo jugador" };

export default async function NewPlayerPage({ params, searchParams }: PageProps<"/g/[slug]/jugadores/nuevo">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.groupPlayers(slug)} />;

  const created = (await searchParams).creado;
  const flash: Record<string, Record<string, string>> =
    typeof created === "string" ? { creado: { [created]: `${created} ya está en el plantel.` } } : {};

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <FlashToast messages={flash} />
      </Suspense>
      <PageHeader
        eyebrow="Plantel"
        title="Nuevo jugador"
        description="No hace falta que tenga cuenta. Si después se suma, vincula esta ficha y conserva sus estadísticas."
      />
      <Card>
        <CardContent>
          {/* key: el formulario se reinicia al cargar otro jugador */}
          <PlayerForm key={typeof created === "string" ? created : "new"} groupId={ctx.group.id} />
        </CardContent>
      </Card>
    </div>
  );
}
