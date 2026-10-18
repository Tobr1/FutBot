"use client";

import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { GroupCrest } from "@/components/shared/group-crest";
import { type MenuItemDef, ResponsiveMenu } from "@/components/ui/responsive-menu";
import { routes } from "@/lib/routes";
import type { Enums } from "@/types/database";

export interface SwitcherGroup {
  slug: string;
  name: string;
  playerCount: number;
  role: Enums<"group_role">;
}

function playersLabel(count: number) {
  return `${count} ${count === 1 ? "jugador" : "jugadores"}`;
}

export function GroupSwitcher({ current, groups }: { current: { slug: string; name: string }; groups: SwitcherGroup[] }) {
  const groupItems: MenuItemDef[] = groups.map((group) => {
    const isCurrent = group.slug === current.slug;
    return {
      key: group.slug,
      label: group.name,
      href: routes.group(group.slug),
      leading: <GroupCrest name={group.name} size="sm" />,
      description: playersLabel(group.playerCount),
      trailing: isCurrent ? (
        <Check className="size-5 text-primary" aria-label="Grupo actual" />
      ) : group.role === "admin" ? (
        <span className="inline-flex h-5 items-center rounded-full bg-white/6 px-1.5 text-2xs font-semibold text-muted-foreground ring-1 ring-hairline ring-inset">
          Admin
        </span>
      ) : undefined,
    };
  });

  return (
    <ResponsiveMenu
      title="Tus grupos"
      align="start"
      trigger={
        <button
          type="button"
          className="pressable -ml-1.5 flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-xl px-1.5 text-left aria-expanded:bg-white/5 [@media(hover:hover)]:hover:bg-white/5"
        >
          <GroupCrest name={current.name} size="sm" />
          <span className="truncate font-display text-lg leading-none font-bold tracking-wide uppercase">{current.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Cambiar de grupo</span>
        </button>
      }
      sections={[
        { items: groupItems },
        {
          items: [
            { key: "crear", label: "Crear grupo", icon: Plus, href: routes.newGroup, transitionTypes: ["nav-forward"] },
            { key: "todos", label: "Ver todos mis grupos", icon: LayoutGrid, href: routes.dashboard },
          ],
        },
      ]}
    />
  );
}
