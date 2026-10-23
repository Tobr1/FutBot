import { Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { SceneImage } from "@/components/brand/scene";
import { GroupCrest } from "@/components/shared/group-crest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type { Tables } from "@/types/database";

type HeroGroup = Pick<Tables<"groups">, "name" | "description" | "default_players_per_team">;

/**
 * Banda superior del inicio del grupo: escudo, chips, nombre y tres números.
 * En mobile va a todo el ancho (sangra el padding del <main>); en escritorio
 * es un bloque redondeado dentro de la columna principal. Va sobre una escena
 * (arco y cancha de noche) oscurecida para que los textos se lean.
 */
export function GroupHero({
  group,
  seasonName,
  activePlayers,
  members,
  isAdmin,
  slug,
}: {
  group: HeroGroup;
  seasonName?: string;
  /** Jugadores activos del plantel. */
  activePlayers: number;
  /** Miembros con cuenta. */
  members: number;
  isAdmin: boolean;
  slug: string;
}) {
  const format = `F${group.default_players_per_team}`;
  const stats = [
    { label: "Jugadores", value: activePlayers },
    { label: "Con cuenta", value: members },
    { label: "Formato", value: format },
  ];

  return (
    <section
      aria-labelledby="page-title"
      className="pitch-lines relative -mx-4 -mt-4 overflow-hidden px-4 pt-16 pb-5 lg:mx-0 lg:mt-0 lg:rounded-2xl lg:px-6 lg:pt-24 lg:pb-6 lg:ring-1 lg:ring-hairline"
    >
      <SceneImage scene="hero-grupo" sizes="(min-width: 1024px) 720px, 100vw" eager />
      <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-background/10" />
      <span aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-background/60 to-transparent" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,oklch(0.66_0.19_256/22%),transparent_60%)]"
      />

      <div className="relative">
        <div className="flex items-start gap-3">
          <GroupCrest name={group.name} size="lg" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pt-1">
            {seasonName && <Badge tone="neutral">{seasonName}</Badge>}
            <Badge tone="primary" className="font-display font-bold tracking-wide">
              {format}
            </Badge>
            {isAdmin && (
              <Badge tone="neutral">
                <Shield className="text-primary" aria-hidden="true" />
                Admin
              </Badge>
            )}
          </div>
          {isAdmin && (
            <Button asChild variant="secondary" className="h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-4">
              <Link href={routes.groupInvitations(slug)} transitionTypes={["nav-forward"]} aria-label="Invitar">
                <UserPlus aria-hidden="true" />
                <span className="hidden sm:inline">Invitar</span>
              </Link>
            </Button>
          )}
        </div>

        <h1
          id="page-title"
          className="mt-3 font-display text-display-lg font-extrabold tracking-wide wrap-break-word uppercase sm:text-4xl sm:leading-[0.95]"
        >
          {group.name}
        </h1>
        {group.description && (
          <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{group.description}</p>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="panel flex flex-col-reverse rounded-xl px-3 py-2">
              <dt className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{stat.label}</dt>
              <dd className="font-display text-2xl leading-tight font-bold tabular">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
