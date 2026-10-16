"use client";

import { Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PlayerCard } from "@/components/shared/player-card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { normalizeName } from "@/domain/names/normalize";
import { POSITION_LABELS, POSITIONS, type Position } from "@/domain/players/positions";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PlayerListItem } from "../queries";

type PositionFilter = Position | "all";

export function PlayersGrid({ slug, players }: { slug: string; players: PlayerListItem[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PositionFilter>("all");
  const [showInactive, setShowInactive] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const inactiveCount = players.filter((p) => !p.isActive).length;

  const filtered = useMemo(() => {
    const q = normalizeName(deferredQuery);
    return players.filter((p) => {
      if (!showInactive && !p.isActive) return false;
      if (position !== "all" && p.positions.primary !== position && p.positions.secondary !== position) return false;
      if (q && !normalizeName(`${p.nickname} ${p.fullName ?? ""}`)?.includes(q)) return false;
      return true;
    });
  }, [players, deferredQuery, position, showInactive]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por apodo o nombre"
            aria-label="Buscar jugador"
            className="pl-9"
          />
        </div>
        {inactiveCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Mostrar inactivos ({inactiveCount})
          </label>
        )}
      </div>

      <div role="radiogroup" aria-label="Filtrar por posición" className="flex gap-2 overflow-x-auto pb-1">
        {(["all", ...POSITIONS] as const).map((value) => {
          const selected = position === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPosition(value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                selected ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "all" ? "Todos" : POSITION_LABELS[value].long}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin resultados" description="Probá con otro nombre o quitá los filtros." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((player) => (
            <li key={player.id}>
              <Link
                href={routes.player(slug, player.id)}
                className="block rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <PlayerCard
                  player={{
                    nickname: player.nickname,
                    fullName: player.fullName,
                    avatarUrl: player.avatarUrl,
                    rating: player.baseRating,
                    primaryPosition: player.positions.primary,
                    isProvisional: player.stats.matches < 3,
                    isLinked: player.isLinked,
                    isActive: player.isActive,
                    stats: player.stats,
                  }}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
