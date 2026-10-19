"use client";

import { ArrowLeftRight, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { RatingPill } from "@/components/shared/player-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { BottomSheet, BottomSheetContent, SheetActionGroup, SheetActionItem } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeName } from "@/domain/names/normalize";

export interface ComparePlayerOption {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  href: string;
}

/** Lista con búsqueda para elegir con quién comparar (también se usa sin hoja). */
export function ComparePlayerList({ options, onPick }: { options: ComparePlayerOption[]; onPick?: () => void }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const visible = useMemo(() => {
    const q = normalizeName(deferred);
    return q ? options.filter((o) => normalizeName(o.nickname)?.includes(q)) : options;
  }, [options, deferred]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugador"
          aria-label="Buscar jugador para comparar"
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      {visible.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">Nadie con ese nombre.</p>
      ) : (
        <SheetActionGroup>
          {visible.map((o) => (
            <SheetActionItem
              key={o.id}
              asChild
              leading={<UserAvatar name={o.nickname} src={o.avatarUrl} size="sm" />}
              label={o.nickname}
              trailing={<RatingPill rating={o.rating} size="sm" />}
              onSelect={onPick}
            >
              <Link href={o.href} transitionTypes={["nav-forward"]} />
            </SheetActionItem>
          ))}
        </SheetActionGroup>
      )}
    </div>
  );
}

/** Botón "Comparar" que abre una hoja para elegir al otro jugador. */
export function ComparePicker({
  options,
  label = "Comparar",
  className,
}: {
  options: ComparePlayerOption[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        <ArrowLeftRight aria-hidden="true" />
        {label}
      </Button>
      <BottomSheetContent title="Comparar con…" description="Elegí otro jugador del plantel." showCancel>
        <div className="pb-2">
          <ComparePlayerList options={options} onPick={() => setOpen(false)} />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
