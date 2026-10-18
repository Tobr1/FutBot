import { ChevronDown, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { PageHeader } from "@/components/shared/page-header";
import { rankClaimCandidates } from "@/domain/names/claim-candidates";
import { getGroupContext } from "@/features/groups/queries";
import { ClaimPlayerList } from "@/features/players/components/claim-player-list";
import { CreateOwnPlayerForm } from "@/features/players/components/create-own-player-form";
import { listUnclaimedPlayers } from "@/features/players/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mi ficha" };

/** Puntaje mínimo para sugerir una ficha (al menos un prefijo de 3+ letras). */
const SUGGESTION_MIN_SCORE = 2;

export default async function ClaimPlayerPage({ params }: PageProps<"/g/[slug]/mi-ficha">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (ctx.myPlayer) redirect(routes.player(slug, ctx.myPlayer.id));

  const [unclaimed, profile] = await Promise.all([listUnclaimedPlayers(ctx.group.id), getCurrentProfile()]);
  const hasCandidates = unclaimed.length > 0;
  const [best] = rankClaimCandidates(profile.displayName, unclaimed);
  const suggestedId = best && best.score >= SUGGESTION_MIN_SCORE ? best.id : undefined;

  return (
    <ScreenTransition>
      <div className="space-y-6 lg:space-y-8">
        <StackHeader backHref={routes.group(slug)} backLabel="Inicio" title={hasCandidates ? "¿Cuál sos vos?" : "Mi ficha"} />
        <PageHeader
          title={hasCandidates ? "¿Cuál sos vos?" : "Creá tu ficha"}
          description={
            hasCandidates
              ? "Elegí tu nombre: conservás tu historial y tus estadísticas."
              : "Nadie te cargó todavía en el plantel: armala en un toque."
          }
        />

        {hasCandidates && <ClaimPlayerList groupId={ctx.group.id} players={unclaimed} suggestedId={suggestedId} />}

        <details className="group/create panel rounded-xl" open={!hasCandidates}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-2.5 pressable-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring group-open/create:rounded-b-none [&::-webkit-details-marker]:hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              <UserPlus className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-semibold">
              {hasCandidates ? "No estoy en la lista · Crear mi ficha" : "Crear mi ficha"}
            </span>
            <ChevronDown
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open/create:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-hairline px-4 pt-4 lg:pb-6">
            <CreateOwnPlayerForm groupId={ctx.group.id} defaultNickname={profile.displayName.split(" ")[0]} />
          </div>
        </details>
      </div>
    </ScreenTransition>
  );
}
