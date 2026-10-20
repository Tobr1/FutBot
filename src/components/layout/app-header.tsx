import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AccountButton, AccountButtonSkeleton } from "./account-button";

/**
 * Encabezado del área privada. Es estático salvo el botón de cuenta
 * (streaming) y nunca se oculta: las pantallas apiladas suman su StackHeader
 * debajo.
 *
 * showLogo="desktop": el shell del grupo muestra en mobile el selector de
 * grupo en lugar del logo.
 */
export function AppHeader({
  children,
  className,
  showLogo = "always",
}: {
  children?: ReactNode;
  className?: string;
  showLogo?: "always" | "desktop";
}) {
  return (
    <header
      data-app-header=""
      style={{ viewTransitionName: "app-header" }}
      className={cn(
        "app-chrome sticky top-0 z-40 border-b border-hairline bg-background/85 pt-[var(--safe-top)] backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 pr-2.5 pl-4 lg:pr-4">
        <Link
          href={routes.dashboard}
          aria-label="FulBot, mis grupos"
          className={cn("shrink-0 items-center rounded-lg", showLogo === "desktop" ? "hidden lg:inline-flex" : "inline-flex")}
        >
          <Logo className="hidden sm:inline-flex" />
          <Logo compact className="sm:hidden" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center">{children}</div>
        <Suspense fallback={<AccountButtonSkeleton />}>
          <AccountButton />
        </Suspense>
      </div>
    </header>
  );
}
