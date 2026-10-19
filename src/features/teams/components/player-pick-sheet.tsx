"use client";

import { ChevronDown, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { BottomSheet, BottomSheetContent, SheetActionGroup, SheetActionItem } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { normalizeName } from "@/domain/names/normalize";
import { cn } from "@/lib/utils";

export interface PickablePlayer {
  id: string;
  nickname: string;
  fullName?: string | null;
  avatarUrl: string | null;
}

/**
 * Campo para elegir un jugador: un botón que muestra al elegido y abre una
 * hoja con búsqueda. `exclude` saca de la lista a quien ya se eligió en el
 * otro campo. Va dentro de un FormField con control="group" (usa {id}-label).
 */
export function PlayerPickSheet({
  id,
  label,
  players,
  value,
  onChange,
  exclude,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  players: readonly PickablePlayer[];
  value: string;
  onChange: (id: string) => void;
  exclude?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const selected = players.find((p) => p.id === value);

  const visible = useMemo(() => {
    const q = normalizeName(deferred);
    return players.filter(
      (p) => p.id !== exclude && (!q || [p.nickname, p.fullName].some((text) => normalizeName(text)?.includes(q))),
    );
  }, [players, deferred, exclude]);

  function pick(playerId: string) {
    onChange(playerId);
    setOpen(false);
    setQuery("");
  }

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label ${id}-value`}
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "pressable flex h-12 w-full min-w-0 items-center gap-2.5 rounded-lg border border-input bg-surface-1 px-3 text-left text-base outline-none md:text-sm",
          "focus-visible:ring-2 focus-visible:ring-ring data-invalid:border-destructive",
        )}
      >
        {selected ? (
          <>
            <UserAvatar name={selected.nickname} src={selected.avatarUrl} size="xs" />
            <span id={`${id}-value`} className="min-w-0 flex-1 truncate font-medium">{selected.nickname}</span>
          </>
        ) : (
          <span id={`${id}-value`} className="min-w-0 flex-1 truncate text-muted-foreground">Elegir jugador</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <BottomSheetContent
        title={label}
        showCancel
        header={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jugador"
              aria-label="Buscar jugador"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className="pl-9"
            />
          </div>
        }
      >
        <div className="pb-2">
          {visible.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted-foreground">Nadie con ese nombre.</p>
          ) : (
            <SheetActionGroup>
              {visible.map((p) => (
                <SheetActionItem
                  key={p.id}
                  leading={<UserAvatar name={p.nickname} src={p.avatarUrl} size="sm" />}
                  label={p.nickname}
                  description={p.fullName ?? undefined}
                  onSelect={() => pick(p.id)}
                />
              ))}
            </SheetActionGroup>
          )}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
