"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { ConvocationEntry, ResolvedReview } from "@/domain/matches/import-review";
import { dedupeSelection, type Selection } from "@/domain/matches/participants";
import { normalizeName } from "@/domain/names/normalize";
import { addPlayersFromImportAction } from "../actions";

export type NewEntry = Extract<ConvocationEntry, { kind: "new" }>;

type Alias = { playerId: string; alias: string };

export interface ImportedConvocation {
  selection: Selection[];
  newPlayers: NewEntry[];
  aliases: Alias[];
}

/**
 * Lo que deja una lista pegada además de los jugadores elegidos: fichas
 * nuevas y alias por recordar. Nada se guarda hasta confirmar; `save` los
 * crea justo antes de guardar la convocatoria y se acuerda de lo creado, así
 * un reintento no duplica fichas.
 */
export function useImportedPlayers(groupId: string) {
  const [newPlayers, setNewPlayers] = useState<NewEntry[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);

  // Fichas ya creadas en un intento anterior: no se crean dos veces.
  const created = useRef<Record<string, string>>({});
  const aliasesSaved = useRef(false);

  /** Toma las fichas nuevas y los alias de una lista revisada (reemplaza los de una anterior). */
  function apply(result: ResolvedReview & { rememberAliases: boolean }) {
    setNewPlayers(result.entries.filter((e): e is NewEntry => e.kind === "new"));
    setAliases(result.rememberAliases ? result.aliases : []);
    aliasesSaved.current = false;
  }

  function reset() {
    setNewPlayers([]);
    setAliases([]);
  }

  function remove(nickname: string) {
    setNewPlayers((list) => list.filter((p) => p.nickname !== nickname));
  }

  /** Crea lo pendiente y devuelve la convocatoria completa: elegidos y, al final, las fichas nuevas. */
  async function save(
    current: ImportedConvocation,
  ): Promise<{ ok: true; participants: Selection[] } | { ok: false; message: string }> {
    let ids = created.current;
    const pending = current.newPlayers.filter((p) => !ids[normalizeName(p.nickname) ?? ""]);
    const aliasesToSave = aliasesSaved.current ? [] : current.aliases;

    if (pending.length > 0 || aliasesToSave.length > 0) {
      const result = await addPlayersFromImportAction({
        groupId,
        players: pending.map((p) => ({ nickname: p.nickname })),
        aliases: aliasesToSave,
      });
      if (!result.ok) return result;
      ids = { ...ids, ...result.data?.ids };
      created.current = ids;
      aliasesSaved.current = true;
    }

    const participants = dedupeSelection([
      ...current.selection,
      ...current.newPlayers.flatMap((p) => {
        const playerId = ids[normalizeName(p.nickname) ?? ""];
        return playerId ? [{ playerId, status: p.status }] : [];
      }),
    ]);
    return { ok: true, participants };
  }

  return { newPlayers, aliases, apply, reset, remove, save };
}

/** Filas de las fichas nuevas de la lista, para poner arriba del plantel. */
export function NewPlayerRows({ players, onRemove }: { players: readonly NewEntry[]; onRemove: (nickname: string) => void }) {
  return players.map((p) => (
    <li key={p.nickname} className="flex min-h-14 items-center gap-3 px-4 py-2">
      <UserAvatar name={p.nickname} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{p.nickname}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <Badge tone="primary" size="sm">
            Ficha nueva
          </Badge>
          <span className="text-xs text-muted-foreground">{p.status === "confirmed" ? "Titular" : "Suplente"}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => onRemove(p.nickname)}
        aria-label={`No crear la ficha de ${p.nickname}`}
        className="pressable grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>
    </li>
  ));
}
