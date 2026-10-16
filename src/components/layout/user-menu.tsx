"use client";

import { LayoutGrid, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";
import { routes } from "@/lib/routes";

export function UserMenu({ name, email, avatarUrl }: { name: string; email: string | null; avatarUrl: string | null }) {
  const [isSigningOut, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        aria-label="Menú de cuenta"
      >
        <UserAvatar name={name} src={avatarUrl} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-semibold text-foreground">{name}</span>
          {email && <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={routes.dashboard}>
              <LayoutGrid aria-hidden="true" />
              Mis grupos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={routes.profile}>
              <UserRound aria-hidden="true" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isSigningOut} onSelect={() => startTransition(() => signOutAction())}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
