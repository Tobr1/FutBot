"use client";

import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Input } from "@/components/ui/input";
import { normalizeName } from "@/domain/names/normalize";
import type { PlayerPositions } from "@/domain/players/positions";
import { claimPlayerAction } from "../actions";

interface ClaimablePlayer {
  id: string;
  nickname: string;
  fullName: string | null;
  positions: PlayerPositions;
}

/** Con más fichas que esto aparece el buscador. */
const SEARCH_THRESHOLD = 8;

const OVERLINE = "px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase";

function matches(player: ClaimablePlayer, query: string): boolean {
  const haystack = `${normalizeName(player.nickname) ?? ""} ${normalizeName(player.fullName) ?? ""}`;
  return haystack.includes(query);
}

/**
 * Fichas sin cuenta para que el jugador elija la suya. La sugerida (por
 * parecido con el nombre de la cuenta) queda fijada arriba. Tocar una fila
 * pide confirmación antes de vincular.
 */
export function ClaimPlayerList({
  groupId,
  players,
  suggestedId,
}: {
  groupId: string;
  players: ClaimablePlayer[];
  suggestedId?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClaimablePlayer | null>(null);
  const [open, setOpen] = useState(false);

  const normalizedQuery = normalizeName(query) ?? "";
  const suggested = suggestedId ? players.find((p) => p.id === suggestedId) : undefined;
  const showSuggested = suggested !== undefined && (!normalizedQuery || matches(suggested, normalizedQuery));
  const rest = useMemo(
    () => players.filter((p) => p.id !== suggested?.id && (!normalizedQuery || matches(p, normalizedQuery))),
    [players, suggested, normalizedQuery],
  );

  function choose(player: ClaimablePlayer) {
    setSelected(player);
    setOpen(true);
  }

  const row = (player: ClaimablePlayer) => (
    <ListRow
      key={player.id}
      asChild
      chevron
      className="min-h-16"
      leading={<UserAvatar name={player.nickname} size="sm" />}
      title={player.nickname}
      subtitle={player.fullName ?? undefined}
      trailing={player.positions.primary ? <PositionBadge position={player.positions.primary} size="sm" /> : undefined}
    >
      <button type="button" onClick={() => choose(player)} />
    </ListRow>
  );

  return (
    <div className="space-y-5">
      {players.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá tu nombre"
            aria-label="Buscar tu nombre en el plantel"
            enterKeyHint="search"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="pl-9"
          />
        </div>
      )}

      {showSuggested && (
        <section className="space-y-2" aria-labelledby="claim-suggested">
          <h2 id="claim-suggested" className={OVERLINE}>
            ¿Sos vos?
          </h2>
          <ul className="overflow-hidden rounded-xl bg-primary/10 shadow-elev-1 ring-1 ring-primary/40">{row(suggested)}</ul>
        </section>
      )}

      {rest.length > 0 ? (
        <section className="space-y-2" aria-labelledby="claim-rest">
          <h2 id="claim-rest" className={OVERLINE}>
            {showSuggested ? "Otros jugadores" : "Jugadores sin cuenta"}
          </h2>
          <ListGroup>{rest.map(row)}</ListGroup>
        </section>
      ) : (
        !showSuggested && (
          <EmptyState
            size="sm"
            tone="neutral"
            icon={SearchX}
            title="No encontramos ese nombre"
            description="Probá con tu apodo o creá tu ficha abajo."
          />
        )
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Sos ${selected?.nickname ?? ""}?`}
        description="La ficha y todas sus estadísticas quedan vinculadas a tu cuenta. Si te equivocás, un admin puede corregirlo."
        confirmLabel="Sí, soy yo"
        destructive={false}
        onConfirm={() => claimPlayerAction({ groupId, playerId: selected?.id })}
      />
    </div>
  );
}
