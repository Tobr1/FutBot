"use client";

import { Check, Search, UserPlus, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmedGuests,
  countSelection,
  GUEST_NAME_MAX,
  type GuestEntry,
  resolveGuestName,
  type Selection,
  setSelectionStatus,
  toggleSelection,
} from "@/domain/matches/participants";
import type { ParticipantStatus } from "@/domain/matches/status";
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
  /** Invitado de otro partido: solo se ve si está convocado o si se lo vuelve a sumar por nombre. */
  isGuest?: boolean;
}

/** Resumen "8/10 titulares · 2 suplentes" (los invitados cuentan). */
export function SelectionSummary({
  selection,
  capacity,
  guests = [],
}: {
  selection: Selection[];
  capacity: number;
  guests?: readonly GuestEntry[];
}) {
  const { confirmed, reserve } = countSelection(selection);
  const total = confirmed + confirmedGuests(guests);
  const reserveTotal = reserve + guests.length - confirmedGuests(guests);
  return (
    <p className="text-sm text-muted-foreground tabular" aria-live="polite">
      <span className={cn("font-semibold", total >= capacity ? "text-success" : "text-foreground")}>
        {total}/{capacity}
      </span>{" "}
      titulares{reserveTotal > 0 && ` · ${reserveTotal} ${reserveTotal === 1 ? "suplente" : "suplentes"}`}
    </p>
  );
}

/** Píldora Titular/Suplente que alterna el estado. */
function StatusToggle({ name, status, onToggle }: { name: string; status: ParticipantStatus; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${name}: ${status === "confirmed" ? "titular, pasar a suplente" : "suplente, pasar a titular"}`}
      className={cn(
        "pressable mr-3 inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold ring-1 ring-inset pointer-coarse:h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        status === "confirmed" ? "bg-success/14 text-success ring-success/25" : "bg-warning/14 text-warning ring-warning/25",
      )}
    >
      {status === "confirmed" ? "Titular" : "Suplente"}
    </button>
  );
}

const flip = (status: ParticipantStatus): ParticipantStatus => (status === "confirmed" ? "reserve" : "confirmed");

/**
 * "Sumar invitado": alguien que viene a completar entra con solo el nombre,
 * sin confirmar asistencia y sin quedar en el plantel. Si el nombre ya tiene
 * ficha (del plantel o de invitado en otro partido), se convoca esa.
 */
function GuestAdder({ onAdd }: { onAdd: (name: string) => string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function submit() {
    const problem = onAdd(name);
    setError(problem);
    if (!problem) setName("");
    inputRef.current?.focus();
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" className="w-full lg:w-auto" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden="true" />
        Sumar invitado
      </Button>
    );
  }

  return (
    <div className="panel space-y-2 rounded-xl p-3">
      <label htmlFor={id} className="block text-sm font-semibold">
        Nombre del invitado
      </label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={name}
          autoFocus
          maxLength={GUEST_NAME_MAX + 10}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            // Dentro del formulario de alta: Enter suma al invitado, no crea el partido.
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ej.: Primo de Juanchi"
          enterKeyHint="done"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          className="min-w-0 flex-1"
        />
        <Button type="button" onClick={submit} className="shrink-0">
          Sumar
        </Button>
      </div>
      <p id={`${id}-hint`} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")} role={error ? "alert" : undefined}>
        {error ?? "Juega este partido y listo: no entra al plantel ni tiene que confirmar."}
      </p>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
          setError(null);
        }}
        className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        Listo
      </button>
    </div>
  );
}

/**
 * Lista del plantel para convocar: tocar un jugador lo suma (como titular
 * hasta completar los equipos y después como suplente) o lo saca. El número
 * marca el orden de llegada; el botón de la derecha alterna titular/suplente.
 * Los inactivos y los invitados solo aparecen si ya estaban convocados.
 * Con `onGuestsChange` se pueden sumar invitados nuevos (se crean al guardar).
 */
export function RosterPicker({
  players,
  selection,
  onChange,
  capacity,
  guests = [],
  onGuestsChange,
  before,
  className,
}: {
  players: RosterOption[];
  selection: Selection[];
  onChange: (next: Selection[]) => void;
  capacity: number;
  guests?: GuestEntry[];
  onGuestsChange?: (next: GuestEntry[]) => void;
  /** Filas extra arriba de la lista (p. ej. fichas nuevas de una importación). */
  before?: ReactNode;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const order = useMemo(() => new Map(selection.map((s, i) => [s.playerId, i])), [selection]);
  const byId = useMemo(() => new Map(selection.map((s) => [s.playerId, s])), [selection]);
  // Los invitados titulares ocupan lugar: el plantel completa lo que queda.
  const rosterCapacity = Math.max(0, capacity - confirmedGuests(guests));

  const visible = useMemo(() => {
    const q = normalizeName(query);
    return players.filter((p) => {
      if ((!p.isActive || p.isGuest) && !byId.has(p.id)) return false;
      if (!q) return true;
      return [p.nickname, p.fullName].some((value) => normalizeName(value)?.includes(q));
    });
  }, [players, query, byId]);

  function addGuest(name: string): string | null {
    const result = resolveGuestName(name, players, guests);
    if (result.kind === "invalid") return result.message;
    if (result.kind === "player") {
      if (byId.has(result.playerId)) return `${result.nickname} ya está convocado.`;
      onChange(toggleSelection(selection, result.playerId, rosterCapacity));
      toast.success(
        result.isGuest
          ? `${result.nickname} ya vino como invitado: lo sumamos otra vez.`
          : `${result.nickname} ya está en el plantel: lo sumamos a la convocatoria.`,
      );
      return null;
    }
    const taken = countSelection(selection).confirmed + confirmedGuests(guests);
    onGuestsChange?.([...guests, { nickname: result.nickname, status: taken >= capacity ? "reserve" : "confirmed" }]);
    return null;
  }

  const guestRows = guests.map((guest) => (
    <li key={guest.nickname} className="flex min-h-14 items-center">
      <span className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4">
        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-solid text-primary-foreground">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <UserAvatar name={guest.nickname} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{guest.nickname}</span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <Badge tone="primary" size="sm">
              Invitado
            </Badge>
          </span>
        </span>
      </span>
      <StatusToggle
        name={guest.nickname}
        status={guest.status}
        onToggle={() =>
          onGuestsChange?.(guests.map((g) => (g.nickname === guest.nickname ? { ...g, status: flip(g.status) } : g)))
        }
      />
      <button
        type="button"
        onClick={() => onGuestsChange?.(guests.filter((g) => g.nickname !== guest.nickname))}
        aria-label={`Quitar a ${guest.nickname}`}
        className="pressable mr-2 -ml-1 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </li>
  ));

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

      {onGuestsChange && <GuestAdder onAdd={addGuest} />}

      <ul className="list-group" aria-label="Plantel">
        {guestRows}
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
                  onClick={() => onChange(toggleSelection(selection, player.id, rosterCapacity))}
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
                      {player.isGuest ? (
                        <Badge tone="primary" size="sm">
                          Invitado
                        </Badge>
                      ) : (
                        player.primaryPosition && <PositionBadge position={player.primaryPosition} size="sm" />
                      )}
                      {position !== undefined && <span className="tabular">#{position + 1}</span>}
                      {!player.isActive && <span>Inactivo</span>}
                    </span>
                  </span>
                  {!selected && <RatingPill rating={player.baseRating} size="sm" />}
                </button>
                {selected && (
                  <StatusToggle
                    name={player.nickname}
                    status={selected.status}
                    onToggle={() => onChange(setSelectionStatus(selection, player.id, flip(selected.status)))}
                  />
                )}
              </li>
            );
          })
        )}
      </ul>
      {(selection.length > 0 || guests.length > 0) && (
        <button
          type="button"
          onClick={() => {
            onChange([]);
            onGuestsChange?.([]);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <X className="size-4" aria-hidden="true" />
          Quitar a todos
        </button>
      )}
    </div>
  );
}
