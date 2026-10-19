"use client";

import { Check, Search, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Input } from "@/components/ui/input";
import { countSelection, type Selection, setSelectionStatus, toggleSelection } from "@/domain/matches/participants";
import { normalizeName } from "@/domain/names/normalize";
import type { Position } from "@/domain/players/positions";
import { cn } from "@/lib/utils";

export interface RosterOption {
  id: string;
  nickname: string;
  fullName?: string | null;
  avatarUrl: string | null;
  baseRating: number;
  primaryPosition: Position | null;
  isActive: boolean;
}

/** Resumen "8/10 titulares · 2 suplentes". */
export function SelectionSummary({ selection, capacity, extra = 0 }: { selection: Selection[]; capacity: number; extra?: number }) {
  const { confirmed, reserve } = countSelection(selection);
  const total = confirmed + extra;
  return (
    <p className="text-sm text-muted-foreground tabular" aria-live="polite">
      <span className={cn("font-semibold", total >= capacity ? "text-success" : "text-foreground")}>
        {total}/{capacity}
      </span>{" "}
      titulares{reserve > 0 && ` · ${reserve} ${reserve === 1 ? "suplente" : "suplentes"}`}
    </p>
  );
}

/**
 * Lista del plantel para convocar: tocar un jugador lo suma (como titular
 * hasta completar los equipos y después como suplente) o lo saca. El número
 * marca el orden de llegada; el botón de la derecha alterna titular/suplente.
 * Los inactivos solo aparecen si ya estaban convocados.
 */
export function RosterPicker({
  players,
  selection,
  onChange,
  capacity,
  before,
  className,
}: {
  players: RosterOption[];
  selection: Selection[];
  onChange: (next: Selection[]) => void;
  capacity: number;
  /** Filas extra arriba de la lista (p. ej. fichas nuevas de una importación). */
  before?: ReactNode;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const order = useMemo(() => new Map(selection.map((s, i) => [s.playerId, i])), [selection]);
  const byId = useMemo(() => new Map(selection.map((s) => [s.playerId, s])), [selection]);

  const visible = useMemo(() => {
    const q = normalizeName(query);
    return players.filter((p) => {
      if (!p.isActive && !byId.has(p.id)) return false;
      if (!q) return true;
      return [p.nickname, p.fullName].some((value) => normalizeName(value)?.includes(q));
    });
  }, [players, query, byId]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el plantel"
          aria-label="Buscar en el plantel"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="pl-9"
        />
      </div>

      <ul className="list-group" aria-label="Plantel">
        {before}
        {visible.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            {query ? "Nadie coincide con la búsqueda." : "No hay jugadores activos en el plantel."}
          </li>
        ) : (
          visible.map((player) => {
            const selected = byId.get(player.id);
            const position = order.get(player.id);
            return (
              <li key={player.id} className="flex min-h-14 items-center">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={Boolean(selected)}
                  onClick={() => onChange(toggleSelection(selection, player.id, capacity))}
                  className="pressable-row flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md ring-1 ring-inset",
                      selected ? "bg-primary-solid text-primary-foreground ring-primary-solid" : "ring-input",
                    )}
                  >
                    {selected && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{player.nickname}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {player.primaryPosition && <PositionBadge position={player.primaryPosition} size="sm" />}
                      {position !== undefined && <span className="tabular">#{position + 1}</span>}
                      {!player.isActive && <span>Inactivo</span>}
                    </span>
                  </span>
                  {!selected && <RatingPill rating={player.baseRating} size="sm" />}
                </button>
                {selected && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(setSelectionStatus(selection, player.id, selected.status === "confirmed" ? "reserve" : "confirmed"))
                    }
                    aria-label={`${player.nickname}: ${selected.status === "confirmed" ? "titular, pasar a suplente" : "suplente, pasar a titular"}`}
                    className={cn(
                      "pressable mr-3 inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold ring-1 ring-inset pointer-coarse:h-11",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected.status === "confirmed"
                        ? "bg-success/14 text-success ring-success/25"
                        : "bg-warning/14 text-warning ring-warning/25",
                    )}
                  >
                    {selected.status === "confirmed" ? "Titular" : "Suplente"}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
      {selection.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <X className="size-4" aria-hidden="true" />
          Quitar a todos
        </button>
      )}
    </div>
  );
}
