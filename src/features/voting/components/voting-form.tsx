"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { Position } from "@/domain/players/positions";
import {
  changedCount,
  isValidScore,
  progressPercent,
  ratedProgressLabel,
  type RatingDraft,
  ratingsPayload,
  scoreHint,
  type VoteSide,
} from "@/domain/voting/voting";
import { cn } from "@/lib/utils";
import { submitRatingsAction } from "../actions";
import { VoteScale } from "./vote-scale";

export interface VotePlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  position: Position | null;
}

export interface VoteGroup {
  key: "teammates" | "rivals";
  title: string;
  side: VoteSide;
  teamName: string;
  players: VotePlayer[];
}

const SIDE_DOT: Record<VoteSide, string> = { a: "bg-team-a", b: "bg-team-b" };
const SIDE_TEXT: Record<VoteSide, string> = { a: "text-team-a", b: "text-team-b" };

/**
 * Calificación de compañeros y rivales: una escala 1-10 por jugador, progreso
 * y envío parcial. Los votos se pueden cambiar hasta el cierre.
 */
export function VotingForm({
  groupId,
  matchId,
  groups,
  saved,
  disabled = false,
}: {
  groupId: string;
  matchId: string;
  groups: VoteGroup[];
  /** Votos ya enviados por esta cuenta (precarga). */
  saved: Record<string, number>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<RatingDraft>(() => ({ ...saved }));
  const [isPending, startTransition] = useTransition();

  const allIds = useMemo(() => groups.flatMap((g) => g.players.map((p) => p.id)), [groups]);
  const rated = allIds.filter((id) => isValidScore(draft[id])).length;
  const changes = changedCount(draft, saved, allIds);
  const hasSaved = Object.keys(saved).length > 0;
  const percent = progressPercent(rated, allIds.length);

  function submit() {
    if (changes === 0 || isPending || disabled) return;
    startTransition(async () => {
      const result = await submitRatingsAction({ groupId, matchId, ratings: ratingsPayload(draft, allIds) });
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) =>
        group.players.length === 0 ? null : (
          <section key={group.key} aria-labelledby={`votar-${group.key}`} className="space-y-2">
            <h2 id={`votar-${group.key}`} className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <span aria-hidden="true" className={cn("size-2 rounded-full", SIDE_DOT[group.side])} />
              {group.title}
              <span className={cn("text-sm font-medium", SIDE_TEXT[group.side])}>{group.teamName}</span>
            </h2>
            <ul className="list-group">
              {group.players.map((player) => {
                const score = draft[player.id];
                const valid = isValidScore(score);
                return (
                  <li key={player.id} className="space-y-2.5 px-4 py-3">
                    <div className="flex min-h-8 items-center gap-2.5">
                      <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{player.nickname}</span>
                      {player.position && <PositionBadge position={player.position} size="sm" />}
                      <span
                        aria-live="polite"
                        className={cn("w-[5.5rem] shrink-0 text-right text-xs", valid ? "font-semibold text-primary" : "text-muted-foreground")}
                      >
                        {valid ? `${score} · ${scoreHint(score)}` : "Sin calificar"}
                      </span>
                    </div>
                    <VoteScale
                      label={`Calificación de ${player.nickname}`}
                      value={valid ? score : null}
                      disabled={disabled || isPending}
                      onChange={(next) => setDraft((d) => ({ ...d, [player.id]: next }))}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}

      <StickyActionBar className="space-y-2.5">
        <div className="flex items-center gap-3">
          <p role="status" className="shrink-0 text-xs font-medium text-muted-foreground tabular">
            {ratedProgressLabel(rated, allIds.length)}
          </p>
          <div
            aria-hidden="true"
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className="h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out-quint motion-reduce:transition-none"
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full lg:w-auto"
          onClick={submit}
          disabled={changes === 0 || isPending || disabled}
          aria-busy={isPending || undefined}
        >
          {isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
          {isPending ? "Enviando…" : hasSaved ? "Guardar cambios" : "Enviar votos"}
        </Button>
        <p className="text-center text-xs text-muted-foreground lg:text-left">
          {changes === 0 && hasSaved ? "Tus votos están guardados. Podés cambiarlos hasta el cierre." : "Podés enviar algunos ahora y completar después."}
        </p>
      </StickyActionBar>
    </div>
  );
}
