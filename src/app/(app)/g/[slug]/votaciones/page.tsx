import { Check, Clock, Lock, Star, Vote } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { formatMatchDate } from "@/domain/matches/datetime";
import { groupVotings } from "@/domain/voting/list";
import { closesInLabel, closesSoon, votersLabel } from "@/domain/voting/voting";
import { getGroupContext } from "@/features/groups/queries";
import { type GroupVoting, listGroupVotings } from "@/features/voting/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Votaciones" };

const FORWARD = ["nav-forward"];

function scoreLine(v: GroupVoting) {
  const { a, b } = v.teams;
  return a.score !== null && b.score !== null ? `${a.name} ${a.score}–${b.score} ${b.name}` : `${a.name} vs ${b.name}`;
}

/**
 * Votaciones del grupo: las que me faltan, las que ya voté, las abiertas
 * donde no jugué y las cerradas. Solo cantidades: nunca qué votó cada uno.
 */
export default async function GroupVotingsPage({ params }: PageProps<"/g/[slug]/votaciones">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  // El estado (abierta / cerrada) depende de la hora: recién después de connection().
  await connection();
  const now = new Date();
  const nowMs = now.getTime();
  const votings = await listGroupVotings(ctx.group.id, ctx.myPlayer?.id ?? null, now.toISOString());
  const sections = groupVotings(votings);
  const timeZone = ctx.group.timezone;

  const openRow = (v: GroupVoting, tone: "pending" | "done" | "watching") => {
    const soon = closesSoon(v.closesAt, nowMs);
    const parts = [closesInLabel(v.closesAt, nowMs)];
    if (v.progress) parts.push(votersLabel(v.progress.voters, v.progress.eligible));
    return (
      <ListRow
        key={v.matchId}
        href={tone === "watching" ? routes.match(slug, v.matchId) : routes.matchVote(slug, v.matchId)}
        transitionTypes={FORWARD}
        leading={
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full ring-1",
              tone === "pending"
                ? "bg-primary/14 text-primary ring-primary/25"
                : tone === "done"
                  ? "bg-success/14 text-success ring-success/25"
                  : "bg-white/6 text-muted-foreground ring-hairline",
            )}
          >
            {tone === "done" ? <Check className="size-5" aria-hidden="true" /> : <Vote className="size-5" aria-hidden="true" />}
          </span>
        }
        title={`${formatMatchDate(v.scheduledAt, timeZone)} · ${scoreLine(v)}`}
        subtitle={
          <span className={cn("inline-flex items-center gap-1", soon && "font-medium text-warning")}>
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {parts.join(" · ")}
          </span>
        }
        trailing={
          tone === "pending" ? (
            <Badge tone="primary" size="sm">
              {v.rated === 0 ? "Votar" : `${v.rated} de ${v.total}`}
            </Badge>
          ) : tone === "done" ? (
            <Badge tone="success" size="sm">
              Votaste
            </Badge>
          ) : undefined
        }
        chevron
      />
    );
  };

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <StackHeader backHref={routes.groupMatches(slug)} backLabel="Partidos" title="Votaciones" />
        <PageHeader
          title="Votaciones"
          description="Calificá a los que jugaron con vos y elegí al jugador del partido. Los votos son anónimos."
        />

        {votings.length === 0 ? (
          <EmptyState
            size="lg"
            icon={Vote}
            scene="luces"
            headingLevel="h2"
            title="Todavía no hubo votaciones"
            description="Cuando se cargue el resultado de un partido, la votación se abre sola y la vas a ver acá."
          />
        ) : (
          <>
            {sections.pending.length > 0 && (
              <section aria-labelledby="votaciones-pendientes" className="space-y-1">
                <SectionHeader id="votaciones-pendientes" title="Te falta votar" count={sections.pending.length} />
                <ListGroup>{sections.pending.map((v) => openRow(v, "pending"))}</ListGroup>
              </section>
            )}
            {sections.done.length > 0 && (
              <section aria-labelledby="votaciones-hechas" className="space-y-1">
                <SectionHeader id="votaciones-hechas" title="Ya votaste" count={sections.done.length} />
                <ListGroup>{sections.done.map((v) => openRow(v, "done"))}</ListGroup>
              </section>
            )}
            {sections.watching.length > 0 && (
              <section aria-labelledby="votaciones-abiertas" className="space-y-1">
                <SectionHeader id="votaciones-abiertas" title="Abiertas" count={sections.watching.length} />
                <p className="px-1 pb-1 text-xs text-muted-foreground">Votan solo quienes jugaron cada partido.</p>
                <ListGroup>{sections.watching.map((v) => openRow(v, "watching"))}</ListGroup>
              </section>
            )}
            {sections.closed.length > 0 && (
              <section aria-labelledby="votaciones-cerradas" className="space-y-1">
                <SectionHeader id="votaciones-cerradas" title="Cerradas" count={sections.closed.length} />
                <ListGroup>
                  {sections.closed.map((v) => (
                    <ListRow
                      key={v.matchId}
                      href={`${routes.match(slug, v.matchId)}#votacion`}
                      transitionTypes={FORWARD}
                      leading={
                        <span className="grid size-10 place-items-center rounded-full bg-white/6 text-muted-foreground ring-1 ring-hairline">
                          <Lock className="size-5" aria-hidden="true" />
                        </span>
                      }
                      title={`${formatMatchDate(v.scheduledAt, timeZone)} · ${scoreLine(v)}`}
                      subtitle={
                        v.mvpNickname ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Star className="size-3 shrink-0 fill-current text-gold" aria-hidden="true" />
                            <span className="truncate">MVP: {v.mvpNickname}</span>
                          </span>
                        ) : (
                          "Calificaciones publicadas"
                        )
                      }
                      chevron
                    />
                  ))}
                </ListGroup>
              </section>
            )}
          </>
        )}
      </div>
    </ScreenTransition>
  );
}
