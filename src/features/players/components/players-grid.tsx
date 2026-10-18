"use client";

import { LayoutGrid, Rows3, Search, SearchX, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { type FilterChipOption, FilterChips } from "@/components/shared/filter-chips";
import { LinkPending } from "@/components/shared/link-pending";
import { ListGroup } from "@/components/shared/list-group";
import { PlayerCard } from "@/components/shared/player-card";
import { PlayerRow } from "@/components/shared/player-row";
import { POSITION_COLOR_VAR } from "@/components/shared/position-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { normalizeName } from "@/domain/names/normalize";
import { POSITION_LABELS, POSITIONS, type Position } from "@/domain/players/positions";
import { overall } from "@/domain/players/rating";
import { sortPlayers } from "@/domain/players/sort";
import { routes } from "@/lib/routes";
import type { PlayerListItem } from "../queries";
import { DEFAULT_PLAYERS_FILTERS, PlayersFilterSheet, type PlayersFilters } from "./players-filter-sheet";

type ChipFilter = Position | "all" | "inactive";

/* ---------- Vista cartas/lista, recordada por dispositivo ---------- */

type PlayersView = "cards" | "list";

const VIEW_KEY = "fb:plantel:view";
/** Respaldo en memoria si el almacenamiento no está disponible (modo privado, bloqueado). */
let memoryView: PlayersView | null = null;

function readView(): PlayersView {
  try {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === "cards" || stored === "list") return stored;
  } catch {
    // sin acceso al almacenamiento
  }
  return memoryView ?? "cards";
}

function writeView(view: PlayersView) {
  memoryView = view;
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // se queda en memoria
  }
  window.dispatchEvent(new Event(VIEW_KEY));
}

function subscribeView(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === VIEW_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(VIEW_KEY, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(VIEW_KEY, onChange);
  };
}

const serverView = (): PlayersView => "cards";

/* ---------- Grilla ---------- */

export function PlayersGrid({ slug, players }: { slug: string; players: PlayerListItem[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ChipFilter>("all");
  const [filters, setFilters] = useState<PlayersFilters>(DEFAULT_PLAYERS_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const view = useSyncExternalStore(subscribeView, readView, serverView);
  const deferredQuery = useDeferredValue(query);

  const inactiveCount = players.filter((p) => !p.isActive).length;
  // Si ya no quedan inactivos (p. ej. se reactivó el último), vuelve a "Todos".
  const activeChip: ChipFilter = chip === "inactive" && inactiveCount === 0 ? "all" : chip;
  const filtersChanged =
    filters.sort !== DEFAULT_PLAYERS_FILTERS.sort || filters.showInactive !== DEFAULT_PLAYERS_FILTERS.showInactive;

  /** Universo del chip elegido, antes de la búsqueda. */
  const scope = useMemo(() => {
    if (activeChip === "inactive") return players.filter((p) => !p.isActive);
    return filters.showInactive ? players : players.filter((p) => p.isActive);
  }, [players, activeChip, filters.showInactive]);

  const chipOptions = useMemo(() => {
    const base = filters.showInactive ? players : players.filter((p) => p.isActive);
    const options: FilterChipOption<ChipFilter>[] = [
      { value: "all", label: "Todos" },
      ...POSITIONS.map((position) => ({
        value: position,
        label: POSITION_LABELS[position].long,
        count: base.filter((p) => playsAt(p, position)).length,
        dot: POSITION_COLOR_VAR[position],
      })),
    ];
    if (inactiveCount > 0) options.push({ value: "inactive", label: "Inactivos", count: inactiveCount });
    return options;
  }, [players, filters.showInactive, inactiveCount]);

  const visible = useMemo(() => {
    const q = normalizeName(deferredQuery);
    const matches = scope.filter((p) => {
      if (activeChip !== "all" && activeChip !== "inactive" && !playsAt(p, activeChip)) return false;
      if (q && !normalizeName(`${p.nickname} ${p.fullName ?? ""}`)?.includes(q)) return false;
      return true;
    });
    return sortPlayers(matches, filters.sort);
  }, [scope, activeChip, deferredQuery, filters.sort]);

  const total = scope.length;

  function clearFilters() {
    setQuery("");
    setChip("all");
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-[var(--chrome-top)] z-20 -mx-4 space-y-2 bg-background/90 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por apodo o nombre"
              aria-label="Buscar jugador"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className="pl-9"
            />
          </div>

          <PlayersFilterSheet
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            filters={filters}
            inactiveCount={inactiveCount}
            onApply={setFilters}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={filtersChanged ? "Filtros (con cambios)" : "Filtros"}
                className="relative"
              >
                <SlidersHorizontal aria-hidden="true" />
                {filtersChanged && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
                  />
                )}
              </Button>
            }
          />

          <ToggleGroup
            type="single"
            variant="outline"
            size="lg"
            spacing={0}
            value={view}
            onValueChange={(next) => {
              if (next === "cards" || next === "list") writeView(next);
            }}
            aria-label="Vista"
          >
            <ToggleGroupItem value="cards" aria-label="Ver como cartas">
              <LayoutGrid aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Ver como lista">
              <Rows3 aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <FilterChips value={activeChip} onValueChange={setChip} options={chipOptions} label="Filtrar por posición" />
      </div>

      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {visible.length} de {total} {total === 1 ? "jugador" : "jugadores"}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          size="sm"
          icon={SearchX}
          headingLevel="h2"
          title="Sin resultados"
          description="Probá con otro nombre o quitá filtros"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : view === "cards" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((player, index) => (
            <li key={player.id}>
              <Link
                href={routes.player(slug, player.id)}
                transitionTypes={["nav-forward"]}
                aria-label={cardLabel(player)}
                className="relative block rounded-xl pressable focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <PlayerCard
                  // Las dos primeras filas suelen quedar sobre el pliegue.
                  priority={index < 4}
                  headingLevel="h2"
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
                <LinkPending />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ListGroup label="Jugadores">
          {visible.map((player) => (
            <PlayerRow
              key={player.id}
              href={routes.player(slug, player.id)}
              player={{
                nickname: player.nickname,
                fullName: player.fullName,
                avatarUrl: player.avatarUrl,
                rating: player.baseRating,
                primaryPosition: player.positions.primary,
                isActive: player.isActive,
                stats: player.stats,
              }}
            />
          ))}
        </ListGroup>
      )}
    </div>
  );
}

function playsAt(player: PlayerListItem, position: Position): boolean {
  return player.positions.primary === position || player.positions.secondary === position;
}

function cardLabel(player: PlayerListItem): string {
  const position = player.positions.primary ? POSITION_LABELS[player.positions.primary].long : "sin posición";
  return `${player.nickname}, valoración ${overall(player.baseRating)}, ${position}${player.isActive ? "" : ", inactivo"}`;
}
