"use client";

import { LayoutGrid, LogOut, UserRound } from "lucide-react";
import { useTransition } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ResponsiveMenu } from "@/components/ui/responsive-menu";
import { signOutAction } from "@/features/auth/actions";
import { routes } from "@/lib/routes";

export function UserMenu({ name, email, avatarUrl }: { name: string; email: string | null; avatarUrl: string | null }) {
  const [isSigningOut, startTransition] = useTransition();
  return (
    <ResponsiveMenu
      title="Tu cuenta"
      align="end"
      trigger={
        <button
          type="button"
          aria-label="Menú de cuenta"
          className="pressable grid size-11 shrink-0 place-items-center rounded-full"
        >
          <UserAvatar name={name} src={avatarUrl} size="sm" />
        </button>
      }
      header={
        <div className="flex items-center gap-3">
          <UserAvatar name={name} src={avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{name}</p>
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>
        </div>
      }
      sections={[
        {
          items: [
            { key: "grupos", label: "Mis grupos", icon: LayoutGrid, href: routes.dashboard },
            { key: "perfil", label: "Mi perfil", icon: UserRound, href: routes.profile, transitionTypes: ["nav-forward"] },
          ],
        },
        {
          items: [
            {
              key: "salir",
              label: isSigningOut ? "Cerrando sesión…" : "Cerrar sesión",
              icon: LogOut,
              destructive: true,
              disabled: isSigningOut,
              onSelect: () => startTransition(() => signOutAction()),
            },
          ],
        },
      ]}
    />
  );
}
