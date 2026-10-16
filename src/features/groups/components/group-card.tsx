import { ChevronRight, Shield, Users } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import type { GroupSummary } from "../queries";

export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={routes.group(group.slug)}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card/80 p-4 transition-colors hover:border-primary/40 hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <span className="pitch-lines absolute inset-y-0 right-0 w-1/3 opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]" />
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 font-display text-xl font-extrabold text-primary ring-1 ring-primary/25">
        {group.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-xl leading-tight font-bold tracking-wide uppercase">{group.name}</h3>
          {group.role === "admin" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold uppercase">
              <Shield className="size-3" aria-hidden="true" />
              Admin
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {group.playerCount} {group.playerCount === 1 ? "jugador" : "jugadores"}
          </span>
          <span>
            {group.memberCount} {group.memberCount === 1 ? "miembro" : "miembros"} con cuenta
          </span>
        </p>
      </div>
      <ChevronRight className="relative size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
