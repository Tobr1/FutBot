import { ChevronRight, MapPin, Star, Users } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { SceneImage } from "@/components/brand/scene";
import { LinkPending } from "@/components/shared/link-pending";
import { Badge } from "@/components/ui/badge";
import { DateChip, Scoreline } from "@/features/matches/components/match-card";
import { MatchStatusBadge } from "@/features/matches/components/match-status-badge";
import type { MatchesOverview } from "@/features/matches/queries";
import { formatLabel, needsResult, squadSize } from "@/domain/matches/status";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const SHIELD = "block size-10 rounded-[28%_28%_46%_46%] bg-surface-3 ring-1 ring-hairline ring-inset";

const OVERLINE = "truncate text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase";

/**
 * Próximo partido en el inicio del grupo (o el último resultado si no hay
 * ninguno programado). Sin partidos, un fixture "fantasma" compacto que
 * invita a crear el primero (menos de 96 px en mobile).
 */
export function NextMatchCard({
  slug,
  featured,
  timeZone,
  today,
  nowMs,
  isAdmin,
  className,
}: {
  slug: string;
  featured: MatchesOverview["featured"];
  timeZone: string;
  today: string;
  nowMs: number;
  isAdmin: boolean;
  className?: string;
}) {
  // Id único por tarjeta: puede haber más de una en la misma pantalla (ui-kit).
  const titleId = useId();
  if (!featured) {
    const content = (
      <>
        {/* Cancha vacía de fondo, detrás del contenido (isolate + -z-10). */}
        <span aria-hidden="true" className="absolute inset-0 -z-10">
          <SceneImage scene="cancha" sizes="(min-width: 1024px) 640px, 100vw" className="opacity-40" />
          <span className="absolute inset-0 bg-linear-to-r from-surface-1 via-surface-1/80 to-surface-1/30" />
        </span>
        <div aria-hidden="true" className="flex shrink-0 items-center gap-2 opacity-70">
          <span className={SHIELD} />
          <span className="font-display text-sm font-bold tracking-wider text-muted-foreground">VS</span>
          <span className={SHIELD} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className={OVERLINE}>
            Próximo partido
          </h2>
          <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
            {isAdmin ? "Creá el primero y convocá con la lista de WhatsApp." : "Todavía no hay partidos programados."}
          </p>
        </div>
        {isAdmin && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </>
    );
    const base = cn("panel relative isolate flex items-center gap-4 overflow-hidden rounded-xl px-4 py-3.5", className);
    return isAdmin ? (
      <Link
        href={routes.newMatch(slug)}
        transitionTypes={["nav-forward"]}
        aria-labelledby={titleId}
        className={cn(base, "pressable relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}
      >
        {content}
        <LinkPending />
      </Link>
    ) : (
      <section aria-labelledby={titleId} className={base}>
        {content}
      </section>
    );
  }

  const { kind, match } = featured;
  const capacity = squadSize(match.playersPerTeam);
  const title = kind === "next" ? "Próximo partido" : "Último resultado";

  return (
    <section aria-labelledby={titleId} className={className}>
      <Link
        href={routes.match(slug, match.id)}
        transitionTypes={["nav-forward"]}
        className="panel pressable relative flex items-center gap-3 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <DateChip scheduledAt={match.scheduledAt} timeZone={timeZone} today={kind === "next" ? today : undefined} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className={OVERLINE}>
              {title}
            </h2>
            {kind === "next" ? (
              <MatchStatusBadge status={match.status} pendingResult={needsResult(match.status, match.scheduledAt, nowMs)} />
            ) : (
              match.mvp && (
                <Badge tone="gold" size="sm" className="max-w-[45%]">
                  <Star className="fill-current" aria-hidden="true" />
                  <span className="truncate">{match.mvp.nickname}</span>
                </Badge>
              )
            )}
          </div>
          {kind === "last" ? (
            <Scoreline teams={match.teams} className="mt-1" />
          ) : (
            <>
              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
                <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{match.venue ?? "Cancha a definir"}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-display text-sm leading-none font-bold tracking-wide text-foreground">
                  {formatLabel(match.playersPerTeam)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 tabular">
                  <Users className="size-3.5" aria-hidden="true" />
                  <span className={cn(match.confirmed >= capacity && "text-success")}>
                    {match.confirmed}/{capacity}
                  </span>
                  <span className="sr-only">confirmados</span>
                </span>
              </span>
            </>
          )}
        </div>
        <LinkPending />
      </Link>
    </section>
  );
}
