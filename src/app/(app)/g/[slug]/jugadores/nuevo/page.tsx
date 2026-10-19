import type { Metadata } from "next";
import { Suspense } from "react";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { FlashToast } from "@/components/shared/flash-toast";
import { PageHeader } from "@/components/shared/page-header";
import { getGroupContext } from "@/features/groups/queries";
import { PlayerForm } from "@/features/players/components/player-form";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Nuevo jugador" };

export default async function NewPlayerPage({ params, searchParams }: PageProps<"/g/[slug]/jugadores/nuevo">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.groupPlayers(slug)} />;

  const created = (await searchParams).creado;
  const isReentry = typeof created === "string";
  const flash: Record<string, Record<string, string>> = isReentry
    ? { creado: { [created]: `${created} ya está en el plantel.` } }
    : {};

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <Suspense fallback={null}>
          <FlashToast messages={flash} />
        </Suspense>
        <StackHeader backHref={routes.groupPlayers(slug)} backLabel="Plantel" title="Nuevo jugador" />
        <PageHeader title="Nuevo jugador" description="No hace falta que tenga cuenta." />
        {/* Sin Card: su overflow-hidden rompería la barra de acciones pegajosa en el teléfono. */}
        <div className="lg:panel lg:rounded-xl lg:p-6">
          {/* key: el formulario se reinicia al cargar otro jugador */}
          <PlayerForm key={isReentry ? created : "new"} groupId={ctx.group.id} autoFocusNickname={isReentry} />
        </div>
      </div>
    </ScreenTransition>
  );
}
