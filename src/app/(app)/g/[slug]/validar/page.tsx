import { Check, IdCard, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";
import { PositionBadge } from "@/components/shared/position-badge";
import { SectionHeader } from "@/components/shared/section-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MIN_VALIDATORS } from "@/domain/cards/cards";
import { getGroupAttributes, getMyValidatedIds } from "@/features/cards/queries";
import { getGroupContext } from "@/features/groups/queries";
import { listPlayers } from "@/features/players/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Validar compañeros" };

const FORWARD = ["nav-forward"];

/**
 * Compañeros para validar sus atributos: primero los que todavía no validé.
 * Muestra cuántas validaciones tiene cada carta (nunca los valores).
 */
export default async function ValidateTeammatesPage({ params }: PageProps<"/g/[slug]/validar">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);

  if (!ctx.myPlayer) {
    return (
      <ScreenTransition>
        <div className="space-y-6">
          <StackHeader backHref={routes.groupPlayers(slug)} backLabel="Plantel" title="Validar compañeros" />
          <PageHeader title="Validar compañeros" />
          <EmptyState
            icon={IdCard}
            headingLevel="h2"
            title="Vinculá tu ficha"
            description="Para validar a tus compañeros necesitás tu ficha del plantel."
            action={
              <Button asChild size="lg">
                <Link href={routes.claimPlayer(slug)} transitionTypes={FORWARD}>
                  Vincular mi ficha
                </Link>
              </Button>
            }
          />
        </div>
      </ScreenTransition>
    );
  }

  const [players, attributes, validated] = await Promise.all([
    listPlayers(ctx.group.id),
    getGroupAttributes(ctx.group.id),
    getMyValidatedIds(ctx.group.id),
  ]);
  const myId = ctx.myPlayer.id;
  const teammates = players.filter((p) => p.id !== myId && p.isActive);
  const pending = teammates.filter((p) => !validated.has(p.id));
  const done = teammates.filter((p) => validated.has(p.id));

  const row = (p: (typeof teammates)[number], isDone: boolean) => {
    const count = attributes.get(p.id)?.validators ?? 0;
    return (
      <ListRow
        key={p.id}
        href={routes.playerAttributes(slug, p.id)}
        transitionTypes={FORWARD}
        leading={<UserAvatar name={p.nickname} src={p.avatarUrl} size="md" />}
        title={
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="truncate">{p.nickname}</span>
            {p.positions.primary && <PositionBadge position={p.positions.primary} size="sm" />}
          </span>
        }
        subtitle={
          count >= MIN_VALIDATORS
            ? `${count} validaciones`
            : `Provisional · ${count} de ${MIN_VALIDATORS} validaciones`
        }
        trailing={
          isDone ? (
            <Badge tone="success" size="sm">
              <Check aria-hidden="true" />
              Validado
            </Badge>
          ) : (
            <Badge tone="primary" size="sm">
              Validar
            </Badge>
          )
        }
        chevron
      />
    );
  };

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <StackHeader backHref={routes.groupPlayers(slug)} backLabel="Plantel" title="Validar compañeros" />
        <PageHeader
          title="Validar compañeros"
          description="Confirmá o ajustá los atributos de cada uno. Es privado: solo cuenta en el promedio de su carta."
        />

        <ListGroup>
          <ListRow
            href={routes.playerAttributes(slug, myId)}
            transitionTypes={FORWARD}
            leading={
              <span className="grid size-10 place-items-center rounded-full bg-primary/14 text-primary ring-1 ring-primary/25">
                <IdCard className="size-5" aria-hidden="true" />
              </span>
            }
            title="Mi autoevaluación"
            subtitle={attributes.get(myId)?.hasSelf ? "Ya la hiciste: podés ajustarla" : "Todavía no la hiciste"}
            chevron
          />
        </ListGroup>

        {teammates.length === 0 ? (
          <EmptyState size="md" icon={Users} scene="mas" title="Todavía no hay compañeros" description="Cuando se sumen al plantel los vas a poder validar." />
        ) : (
          <>
            {pending.length > 0 && (
              <section aria-labelledby="validar-pendientes" className="space-y-1">
                <SectionHeader id="validar-pendientes" title="Te faltan" count={pending.length} />
                <ListGroup>{pending.map((p) => row(p, false))}</ListGroup>
              </section>
            )}
            {done.length > 0 && (
              <section aria-labelledby="validar-hechos" className="space-y-1">
                <SectionHeader id="validar-hechos" title="Ya validaste" count={done.length} />
                <ListGroup>{done.map((p) => row(p, true))}</ListGroup>
              </section>
            )}
          </>
        )}
      </div>
    </ScreenTransition>
  );
}
