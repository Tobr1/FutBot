"use client";

import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/lib/routes";

export function GroupSwitcher({
  current,
  groups,
}: {
  current: { slug: string; name: string };
  groups: Array<{ slug: string; name: string }>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex max-w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60">
        <span className="truncate font-display text-lg leading-none font-bold tracking-wide uppercase">{current.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Cambiar de grupo</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Tus grupos</DropdownMenuLabel>
        <DropdownMenuGroup>
          {groups.map((group) => (
            <DropdownMenuItem key={group.slug} asChild>
              <Link href={routes.group(group.slug)}>
                <span className="flex-1 truncate">{group.name}</span>
                {group.slug === current.slug && <Check className="text-primary" aria-label="Grupo actual" />}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={routes.newGroup}>
            <Plus aria-hidden="true" />
            Crear grupo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.dashboard}>
            <LayoutGrid aria-hidden="true" />
            Ver todos
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
