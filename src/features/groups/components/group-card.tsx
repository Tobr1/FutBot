import { ChevronRight, Shield } from "lucide-react";
import Link from "next/link";
import { GroupCrest } from "@/components/shared/group-crest";
import { LinkPending } from "@/components/shared/link-pending";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import type { GroupSummary } from "../queries";

export function GroupCard({ group }: { group: GroupSummary }) {
  const players = `${group.playerCount} ${group.playerCount === 1 ? "jugador" : "jugadores"}`;
  return (
    <Link
      href={routes.group(group.slug)}
      transitionTypes={["nav-forward"]}
      className="panel pressable relative flex min-h-20 items-center gap-4 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <GroupCrest name={group.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-display text-xl leading-tight font-bold tracking-wide uppercase">{group.name}</h3>
          {group.role === "admin" && (
            <Badge tone="neutral" size="sm" className="shrink-0">
              <Shield className="text-primary" aria-hidden="true" />
              Admin
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular">
          {players} · {group.memberCount} con cuenta
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <LinkPending />
    </Link>
  );
}
