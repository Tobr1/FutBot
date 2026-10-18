"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function SettingsNav({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: routes.groupSettings(slug), label: "General" },
    { href: routes.groupMembers(slug), label: "Miembros" },
    ...(isAdmin ? [{ href: routes.groupInvitations(slug), label: "Invitaciones" }] : []),
    { href: routes.groupSeasons(slug), label: "Temporadas" },
  ];

  return (
    <nav aria-label="Ajustes del grupo" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/60 p-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-lg px-3.5 text-sm font-medium transition-colors",
              active ? "bg-primary-solid text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
