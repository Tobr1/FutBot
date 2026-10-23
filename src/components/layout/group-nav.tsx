"use client";

import { CalendarDays, House, type LucideIcon, Menu, Trophy, Users } from "lucide-react";
import * as m from "motion/react-m";
import Link, { useLinkStatus } from "next/link";
import { useParams, usePathname } from "next/navigation";
import { type MouseEvent, useLayoutEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { SPRING } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type GroupNavKey = "inicio" | "partidos" | "plantel" | "rankings" | "mas";

export interface GroupNavItem {
  key: GroupNavKey;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Activo solo en la ruta exacta (Inicio). */
  exact?: boolean;
  /** Prefijos que también activan el ítem (por defecto, su href). */
  matches: string[];
}

/** Las 5 secciones del grupo: la misma lista para la barra inferior y las pestañas. */
export function NAV_ITEMS(slug: string): GroupNavItem[] {
  return [
    { key: "inicio", href: routes.group(slug), label: "Inicio", icon: House, exact: true, matches: [routes.group(slug)] },
    {
      key: "partidos",
      href: routes.groupMatches(slug),
      label: "Partidos",
      icon: CalendarDays,
      matches: [routes.groupMatches(slug), routes.groupHistory(slug), routes.groupVotings(slug)],
    },
    { key: "plantel", href: routes.groupPlayers(slug), label: "Plantel", icon: Users, matches: [routes.groupPlayers(slug)] },
    {
      key: "rankings",
      href: routes.groupRankings(slug),
      label: "Rankings",
      icon: Trophy,
      matches: [routes.groupRankings(slug), routes.groupAwards(slug), routes.groupAnalytics(slug)],
    },
    {
      key: "mas",
      href: routes.groupSettings(slug),
      label: "Más",
      icon: Menu,
      matches: [routes.groupSettings(slug), routes.groupAdmin(slug), routes.claimPlayer(slug)],
    },
  ];
}

function trimTrailingSlash(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function isNavItemActive(pathname: string, item: GroupNavItem): boolean {
  const path = trimTrailingSlash(pathname);
  if (item.exact) return item.matches.includes(path);
  return item.matches.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Clave de la sección activa para una ruta, o null si ninguna coincide. */
export function activeNavKey(pathname: string, slug: string): GroupNavKey | null {
  return NAV_ITEMS(slug).find((item) => isNavItemActive(pathname, item))?.key ?? null;
}

const BOTTOM_NAV_CLASS =
  "app-chrome fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-[oklch(0.13_0.025_262/92%)] pb-[var(--safe-bottom)] backdrop-blur-md lg:hidden";
const BOTTOM_NAV_LIST_CLASS = "mx-auto grid h-16 max-w-md grid-cols-5";
const BOTTOM_NAV_LINK_CLASS = "group relative flex flex-1 flex-col items-center justify-center gap-0.5 outline-none focus-visible:-outline-offset-4";
const BOTTOM_NAV_PILL_CLASS = "relative grid h-8 w-14 place-items-center rounded-full transition-transform duration-150 ease-out-quint group-active:scale-90";

/** Punto de "cargando" si la navegación tarda más de 100 ms. */
function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      data-pending={pending || undefined}
      className="absolute top-0.5 right-2.5 size-1.5 rounded-full bg-primary opacity-0 transition-opacity duration-150 data-pending:opacity-100 data-pending:delay-100"
    />
  );
}

/** Barra inferior (presentacional): recibe slug y ruta para poder mostrarse en la galería. */
export function BottomNavBar({ slug, pathname, className }: { slug: string; pathname: string; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();

  const scrollToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <nav
      data-bottom-nav=""
      aria-label="Secciones del grupo"
      style={{ viewTransitionName: "bottom-nav" }}
      className={cn(BOTTOM_NAV_CLASS, className)}
    >
      <ul className={BOTTOM_NAV_LIST_CLASS}>
        {NAV_ITEMS(slug).map((item) => {
          const active = isNavItemActive(pathname, item);
          // Tocar la pestaña activa en su raíz sube al inicio; en una subpantalla vuelve a la raíz.
          const atRoot = active && trimTrailingSlash(pathname) === item.href;
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={atRoot ? scrollToTop : undefined}
                className={cn(BOTTOM_NAV_LINK_CLASS, active ? "text-foreground" : "text-muted-foreground")}
              >
                <span className={BOTTOM_NAV_PILL_CLASS}>
                  {active ? (
                    <m.span
                      layoutId="bottom-nav-pill"
                      transition={SPRING.snappy}
                      className="absolute inset-0 rounded-full bg-primary/16"
                    />
                  ) : null}
                  <item.icon
                    className={cn("relative size-[22px]", active ? "stroke-[2.25] text-primary" : "stroke-[1.75]")}
                    aria-hidden="true"
                  />
                  <PendingDot />
                </span>
                <span className={cn("text-2xs", active ? "font-semibold" : "font-medium")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barra inferior del grupo. Usa rutas del cliente: renderizar dentro de <Suspense fallback={<GroupBottomNavSkeleton />}>. */
export function GroupBottomNav() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  // Avisa al <html> (toasts y otros portales) que la barra está a la vista. Los
  // efectos se desmontan cuando Next oculta la ruta con <Activity>.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-group-chrome", "");
    return () => document.documentElement.removeAttribute("data-group-chrome");
  }, []);
  return <BottomNavBar slug={slug} pathname={pathname} />;
}

/** Mismo markup que la barra (sin sección activa), para el shell prerenderizado. */
export function GroupBottomNavSkeleton({ className }: { className?: string }) {
  return (
    <div data-bottom-nav="" aria-hidden="true" className={cn(BOTTOM_NAV_CLASS, className)}>
      <ul className={BOTTOM_NAV_LIST_CLASS}>
        {NAV_ITEMS("_").map((item) => (
          <li key={item.key} className="flex">
            <span className={cn(BOTTOM_NAV_LINK_CLASS, "text-muted-foreground")}>
              <span className={BOTTOM_NAV_PILL_CLASS}>
                <item.icon className="relative size-[22px] stroke-[1.75]" aria-hidden="true" />
              </span>
              <span className="text-2xs font-medium">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS_NAV_CLASS = "no-scrollbar -mb-px flex gap-1 overflow-x-auto";
const TAB_CLASS =
  "relative inline-flex h-11 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full";

function GroupTabsBar({ slug, pathname }: { slug: string; pathname: string }) {
  return (
    <nav aria-label="Secciones del grupo" className={TABS_NAV_CLASS}>
      {NAV_ITEMS(slug).map((item) => {
        const active = isNavItemActive(pathname, item);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              TAB_CLASS,
              active ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground",
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

/** Pestañas de escritorio. Renderizar dentro de <Suspense fallback={<GroupTabsSkeleton />}>. */
export function GroupTabs() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  return <GroupTabsBar slug={slug} pathname={pathname} />;
}

export function GroupTabsSkeleton() {
  return (
    <div aria-hidden="true" className={TABS_NAV_CLASS}>
      {NAV_ITEMS("_").map((item) => (
        <span key={item.key} className={cn(TAB_CLASS, "text-muted-foreground")}>
          <item.icon className="size-4" aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}
