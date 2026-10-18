"use client";

import { type ReactElement, useId, useState } from "react";
import { ChoiceCards, type ChoiceOption } from "@/components/shared/choice-cards";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { BottomSheet, BottomSheetContent, BottomSheetTrigger } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PlayerSortKey } from "@/domain/players/sort";

export interface PlayersFilters {
  sort: PlayerSortKey;
  showInactive: boolean;
}

export const DEFAULT_PLAYERS_FILTERS: PlayersFilters = { sort: "rating", showInactive: false };

const SORT_OPTIONS: ChoiceOption<PlayerSortKey>[] = [
  { value: "rating", label: "Valoración" },
  { value: "matches", label: "Partidos" },
  { value: "goals", label: "Goles" },
  { value: "assists", label: "Asistencias" },
  { value: "name", label: "A–Z" },
];

/**
 * Hoja de filtros del plantel (orden e inactivos). Controlada por
 * PlayersGrid: edita un borrador y recién "Aplicar" lo confirma.
 */
export function PlayersFilterSheet({
  open,
  onOpenChange,
  filters,
  inactiveCount,
  onApply,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PlayersFilters;
  inactiveCount: number;
  onApply: (filters: PlayersFilters) => void;
  /** Botón que abre la hoja (recibe el foco al cerrarla). */
  trigger: ReactElement;
}) {
  const sortLabelId = useId();
  const inactiveSwitchId = useId();
  const [draft, setDraft] = useState(filters);
  const [wasOpen, setWasOpen] = useState(open);

  // Cada vez que se abre, el borrador arranca desde los filtros aplicados.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  function apply(next: PlayersFilters) {
    onApply(next);
    onOpenChange(false);
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
      <BottomSheetContent
        title="Filtros"
        footer={
          <>
            <Button type="button" size="lg" className="h-12 w-full" onClick={() => apply(draft)}>
              Aplicar
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="h-12 w-full"
              onClick={() => apply(DEFAULT_PLAYERS_FILTERS)}
            >
              Restablecer
            </Button>
          </>
        }
      >
        <div className="space-y-5 pb-2">
          <div className="space-y-2">
            <p id={sortLabelId} className="px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Ordenar por
            </p>
            <ChoiceCards
              name="sort"
              value={draft.sort}
              onChange={(sort) => {
                if (sort) setDraft((d) => ({ ...d, sort }));
              }}
              options={SORT_OPTIONS}
              columns="grid-cols-2 sm:grid-cols-3"
              ariaLabelledBy={sortLabelId}
            />
          </div>

          <ListGroup>
            <ListRow
              asChild
              title="Mostrar inactivos"
              subtitle={
                inactiveCount === 0
                  ? "No hay jugadores inactivos"
                  : `${inactiveCount} ${inactiveCount === 1 ? "inactivo" : "inactivos"} en el plantel`
              }
              trailing={
                <Switch
                  id={inactiveSwitchId}
                  checked={draft.showInactive}
                  disabled={inactiveCount === 0}
                  onCheckedChange={(showInactive) => setDraft((d) => ({ ...d, showInactive }))}
                />
              }
            >
              <label htmlFor={inactiveSwitchId} />
            </ListRow>
          </ListGroup>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
