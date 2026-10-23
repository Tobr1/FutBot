import { IdCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { attributeKindFor } from "@/domain/cards/cards";
import { AttributesForm } from "@/features/cards/components/attributes-form";
import { getMySelfAssessment, getValidationForm } from "@/features/cards/queries";
import { getGroupContext } from "@/features/groups/queries";
import { getPlayer } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Atributos" };

/** Punto de partida si todavía no hay valores: el medio de la escala. */
const NEUTRAL = [50, 50, 50, 50, 50, 50];

/**
 * Atributos de una ficha: en la propia, la autoevaluación; en la de un
 * compañero, su validación (arranca con mi validación anterior o con su
 * autoevaluación). Sin ficha vinculada no se puede ni una cosa ni la otra.
 */
export default async function PlayerAttributesPage({ params }: PageProps<"/g/[slug]/jugadores/[playerId]/atributos">) {
  const { slug, playerId } = await params;
  const ctx = await getGroupContext(slug);
  const player = await getPlayer(ctx.group.id, playerId);
  if (!player) notFound();

  const playerHref = routes.player(slug, player.id);
  const position = player.positions.primary;
  const kind = attributeKindFor(position);
  const isMine = ctx.myPlayer?.id === player.id;

  let body;
  let title: string;
  let description: string;
  if (!ctx.myPlayer) {
    title = "Atributos";
    description = "Para autoevaluarte o validar a tus compañeros necesitás tu ficha del plantel.";
    body = (
      <EmptyState
        icon={IdCard}
        headingLevel="h2"
        title="Vinculá tu ficha"
        description="Elegí tu nombre en el plantel y después volvé acá."
        action={
          <Button asChild size="lg">
            <Link href={routes.claimPlayer(slug)} transitionTypes={["nav-forward"]}>
              Vincular mi ficha
            </Link>
          </Button>
        }
      />
    );
  } else if (isMine) {
    const mine = await getMySelfAssessment(player.id, kind);
    title = "Mi autoevaluación";
    description = mine
      ? "Podés ajustarla cuando quieras. Tus compañeros la ven como punto de partida al validarte."
      : "Contá cómo jugás. Después tus compañeros la validan y así se arma tu carta.";
    body = (
      <AttributesForm
        mode="self"
        groupId={ctx.group.id}
        playerId={player.id}
        position={position}
        kind={kind}
        initial={mine ?? NEUTRAL}
        backHref={playerHref}
      />
    );
  } else {
    const form = await getValidationForm(player.id);
    title = `Validar a ${player.nickname}`;
    description =
      form?.source === "mine"
        ? "Ya lo validaste: podés corregir tus valores."
        : form?.source === "self"
          ? "Arranca con su autoevaluación: confirmala o ajustá lo que no te cierre."
          : "Todavía no se autoevaluó: poné cómo lo ves vos.";
    body = (
      <AttributesForm
        mode="peer"
        groupId={ctx.group.id}
        playerId={player.id}
        position={position}
        kind={form?.kind ?? kind}
        initial={form?.scores?.length === 6 ? form.scores : NEUTRAL}
        backHref={playerHref}
      />
    );
  }

  return (
    <ScreenTransition>
      <div className="mx-auto max-w-2xl space-y-6">
        <StackHeader backHref={playerHref} backLabel={player.nickname} title={title} />
        <PageHeader eyebrow={kind === "goalkeeper" ? "Atributos de arquero" : "Atributos"} title={title} description={description} />
        {body}
      </div>
    </ScreenTransition>
  );
}
