import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AccountButton, AccountButtonSkeleton } from "./account-button";

/** Encabezado del área privada. Es estático salvo el botón de cuenta (streaming). */
export function AppHeader({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href={routes.dashboard} aria-label="FUTBOLEROS, mis grupos" className="shrink-0">
          <Logo className="hidden sm:inline-flex" />
          <Logo compact className="sm:hidden" />
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <Suspense fallback={<AccountButtonSkeleton />}>
          <AccountButton />
        </Suspense>
      </div>
    </header>
  );
}
