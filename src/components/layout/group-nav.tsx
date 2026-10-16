"use client";

import { CalendarDays, House, type LucideIcon, Settings2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

function navItems(slug: string): NavItem[] {
  return [
    { href: routes.group(slug), label: "Inicio", icon: House, exact: true },
    { href: routes.groupMatches(slug), label: "Partidos", icon: CalendarDays },
    { href: routes.groupPlayers(slug), label: "Plantel", icon: Users },
    { href: routes.groupRankings(slug), label: "Rankings", icon: Trophy },
    { href: routes.groupSettings(slug), label: "Grupo", icon: Settings2 },
  ];
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Pestañas superiores (escritorio). */
export function GroupTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del grupo" className="-mb-px flex gap-1 overflow-x-auto">
      {navItems(slug).map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior fija (mobile). */
export function GroupBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones del grupo"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {navItems(slug).map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />}
                <item.icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
