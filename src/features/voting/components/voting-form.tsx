"use client";

import { ArrowLeft, ArrowRight, Check, EyeOff, Loader2, Lock, Pencil, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { Position } from "@/domain/players/positions";
import { firstPendingIndex, stepStatus, summaryLabel, votingSummary } from "@/domain/voting/steps";
import {
  changedCount,
  isValidScore,
  progressPercent,
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

interface StepPlayer extends VotePlayer {
  side: VoteSide;
  groupTitle: string;
  teamName: string;
}

interface StoredDraft {
  draft: RatingDraft;
  skipped: string[];
  mvp: string | null;
}

const storageKey = (matchId: string) => `fulbot:votos:${matchId}`;

/** Borrador local (por si se cierra la app a mitad de la votación). Nunca es obligatorio. */
function readStored(matchId: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(storageKey(matchId));
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
}

function writeStored(matchId: string, value: StoredDraft | null) {
  try {
    if (value) window.localStorage.setItem(storageKey(matchId), JSON.stringify(value));
    else window.localStorage.removeItem(storageKey(matchId));
  } catch {
    // Sin almacenamiento (modo privado): el borrador vive solo en la pantalla.
  }
}

/**
 * Votación paso a paso: un jugador por pantalla (escala 1-10 sin valor
 * marcado, o "No lo vi jugar", que no cuenta como voto), después el MVP y
 * un resumen antes de enviar. Se puede ir y volver; el borrador se guarda en
 * el teléfono hasta enviar. Los votos se pueden cambiar hasta el cierre.
 */
export function VotingForm({
  groupId,
  matchId,
  groups,
  saved,
  savedMvp = null,
  disabled = false,
}: {
  groupId: string;
  matchId: string;
  groups: VoteGroup[];
  /** Votos ya enviados por esta cuenta (precarga). */
  saved: Record<string, number>;
  /** MVP ya elegido por esta cuenta (precarga). */
  savedMvp?: string | null;
  disabled?: boolean;
}) {
  const players = useMemo<StepPlayer[]>(
    () => groups.flatMap((g) => g.players.map((p) => ({ ...p, side: g.side, groupTitle: g.title, teamName: g.teamName }))),
    [groups],
  );
  const ids = useMemo(() => players.map((p) => p.id), [players]);
  const hasSaved = Object.keys(saved).length > 0 || savedMvp !== null;

  const [draft, setDraft] = useState<RatingDraft>(() => ({ ...saved }));
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [mvp, setMvp] = useState<string | null>(savedMvp);
  // Pasos: 0..n-1 jugadores, n = MVP, n+1 = resumen. Si ya votó, arranca en el resumen.
  const mvpStep = players.length;
  const summaryStep = players.length + 1;
  const [step, setStep] = useState(hasSaved ? summaryStep : 0);
  const [isPending, startTransition] = useTransition();
  const restored = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Recupera el borrador del teléfono (una vez, después de hidratar).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readStored(matchId);
    if (!stored) return;
    const allowed = new Set(ids);
    const frame = requestAnimationFrame(() => {
      setDraft((d) => {
        const next = { ...d };
        for (const [id, score] of Object.entries(stored.draft)) if (allowed.has(id) && isValidScore(score)) next[id] = score;
        return next;
      });
      setSkipped(new Set(stored.skipped.filter((id) => allowed.has(id))));
      if (stored.mvp && allowed.has(stored.mvp)) setMvp(stored.mvp);
    });
    return () => cancelAnimationFrame(frame);
  }, [ids, matchId]);

  useEffect(() => {
    if (!restored.current) return;
    writeStored(matchId, { draft, skipped: [...skipped], mvp });
  }, [draft, skipped, mvp, matchId]);

  // Al cambiar de paso, el foco va al título (lectores de pantalla y teclado).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  const summary = votingSummary(ids, draft, skipped);
  const mvpChanged = mvp !== null && mvp !== savedMvp;
  const changes = changedCount(draft, saved, ids) + (mvpChanged ? 1 : 0);
  const payload = ratingsPayload(draft, ids);
  const busy = disabled || isPending;

  function rate(id: string, score: number) {
    setDraft((d) => ({ ...d, [id]: score }));
    setSkipped((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  function skip(id: string) {
    // Si ya estaba enviado, no se puede "desvotar": queda la nota guardada.
    if (isValidScore(saved[id])) {
      toast.info("Ya lo habías calificado: si querés, cambiá la nota.");
      return;
    }
    setDraft((d) => ({ ...d, [id]: null }));
    setSkipped((s) => new Set(s).add(id));
    setStep((n) => n + 1);
  }

  function submit() {
    if (busy || changes === 0) return;
    startTransition(async () => {
      const result = await submitRatingsAction({ groupId, matchId, ratings: payload, mvpPlayerId: mvp });
      if (result.ok) writeStored(matchId, null);
      else toast.error(result.message);
    });
  }

  const totalSteps = players.length + 1;
  const progress = progressPercent(Math.min(step, totalSteps), totalSteps);

  // ---------- Jugador ----------
  if (step < players.length) {
    const player = players[step];
    const score = draft[player.id];
    const status = stepStatus(player.id, draft, skipped);
    return (
      <div className="space-y-5">
        <StepProgress label={`Jugador ${step + 1} de ${players.length}`} percent={progress} />
        <section aria-labelledby="voto-jugador" className="panel space-y-5 rounded-2xl px-4 py-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold">
            <span aria-hidden="true" className={cn("size-2 rounded-full", SIDE_DOT[player.side])} />
            {player.groupTitle}
            <span className={SIDE_TEXT[player.side]}>{player.teamName}</span>
          </p>
          <div className="flex flex-col items-center gap-2">
            <UserAvatar name={player.nickname} src={player.avatarUrl} size="xl" />
            <h2
              id="voto-jugador"
              ref={headingRef}
              tabIndex={-1}
              className="max-w-full truncate font-display text-3xl leading-none font-extrabold tracking-wide uppercase outline-none"
            >
              {player.nickname}
            </h2>
            {player.position && <PositionBadge position={player.position} size="sm" />}
          </div>
          <p aria-live="polite" className="font-display text-5xl leading-none font-extrabold tabular">
            {isValidScore(score) ? score : "—"}
            <span className="text-lg text-muted-foreground">/10</span>
            <span className="mt-1 block font-sans text-sm font-medium text-muted-foreground">
              {isValidScore(score) ? scoreHint(score) : status === "skipped" ? "No lo viste jugar" : "Elegí una nota"}
            </span>
          </p>
          <VoteScale
            label={`Calificación de ${player.nickname}`}
            value={isValidScore(score) ? score : null}
            disabled={busy}
            onChange={(next) => rate(player.id, next)}
          />
        </section>
        <StickyActionBar className="grid grid-cols-[auto_1fr_1fr] gap-2">
          <Button type="button" variant="ghost" size="lg" className="px-3" disabled={step === 0} onClick={() => setStep((n) => n - 1)} aria-label="Anterior">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => skip(player.id)}>
            <EyeOff aria-hidden="true" />
            No lo vi
          </Button>
          <Button type="button" size="lg" disabled={busy || status === "pending"} onClick={() => setStep((n) => n + 1)}>
            Siguiente
            <ArrowRight aria-hidden="true" />
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  // ---------- MVP ----------
  if (step === mvpStep) {
    return (
      <div className="space-y-5">
        <StepProgress label="Jugador del partido" percent={progress} />
        <section aria-labelledby="votar-mvp" className="space-y-3">
          <div className="space-y-0.5">
            <h2
              id="votar-mvp"
              ref={headingRef}
              tabIndex={-1}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight outline-none"
            >
              <Star className="size-5 fill-current text-gold" aria-hidden="true" />
              ¿Quién fue el jugador del partido?
            </h2>
            <p className="text-sm text-muted-foreground">Elegí uno solo. Gana el más votado.</p>
          </div>
          <div role="radiogroup" aria-labelledby="votar-mvp" className="grid grid-cols-2 gap-2">
            {players.map((player) => {
              const selected = mvp === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => setMvp(player.id)}
                  className={cn(
                    "pressable flex min-h-12 min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left ring-1 ring-inset transition-colors disabled:opacity-50",
                    selected ? "bg-gold/12 ring-gold/60" : "bg-surface-1 ring-hairline",
                  )}
                >
                  <UserAvatar name={player.nickname} src={player.avatarUrl} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.nickname}</span>
                  <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", SIDE_DOT[player.side])} />
                  {selected && <Star className="size-4 shrink-0 fill-current text-gold" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>
        <StickyActionBar className="grid grid-cols-[auto_1fr] gap-2">
          <Button type="button" variant="ghost" size="lg" className="px-3" disabled={players.length === 0} onClick={() => setStep(players.length - 1)} aria-label="Anterior">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button type="button" size="lg" onClick={() => setStep(summaryStep)}>
            {mvp ? "Ver resumen" : "Seguir sin MVP"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  // ---------- Resumen ----------
  const mvpPlayer = players.find((p) => p.id === mvp);
  const pendingIndex = firstPendingIndex(ids, draft, skipped);
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">
          {hasSaved && changes === 0 ? "Tus votos" : "Revisá antes de enviar"}
        </h2>
        <p className="text-sm text-muted-foreground">{summaryLabel(summary)}</p>
      </div>

      <ul className="list-group" aria-label="Resumen de tus votos">
        {players.map((player, index) => {
          const score = draft[player.id];
          const status = stepStatus(player.id, draft, skipped);
          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className="pressable flex min-h-14 w-full min-w-0 items-center gap-3 px-4 py-2 text-left"
                aria-label={`Cambiar el voto de ${player.nickname}`}
              >
                <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{player.nickname}</span>
                  <span className={cn("text-xs", SIDE_TEXT[player.side])}>{player.teamName}</span>
                </span>
                {status === "rated" && isValidScore(score) ? (
                  <span className="font-display text-xl font-extrabold tabular">{score}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{status === "skipped" ? "No lo viste" : "Sin calificar"}</span>
                )}
                <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setStep(mvpStep)}
            className="pressable flex min-h-14 w-full min-w-0 items-center gap-3 px-4 py-2 text-left"
            aria-label="Cambiar el jugador del partido"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/12 text-gold ring-1 ring-gold/30">
              <Star className="size-4 fill-current" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Jugador del partido</span>
              <span className="block truncate text-[15px] font-semibold">{mvpPlayer?.nickname ?? "Sin elegir"}</span>
            </span>
            <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      </ul>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Tus votos son anónimos: nadie ve qué nota pusiste, ni el admin. Podés cambiarlos hasta el cierre.
      </p>

      <StickyActionBar className="space-y-2">
        {pendingIndex >= 0 && (
          <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setStep(pendingIndex)}>
            Seguir calificando
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={busy || changes === 0 || (payload.length === 0 && mvp === null)}
          aria-busy={isPending || undefined}
        >
          {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {isPending ? "Enviando…" : hasSaved ? (changes === 0 ? "Votos guardados" : "Guardar cambios") : "Enviar votos"}
        </Button>
      </StickyActionBar>
    </div>
  );
}

function StepProgress({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 text-xs font-medium text-muted-foreground tabular">{label}</p>
      <div aria-hidden="true" className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out-quint motion-reduce:transition-none"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
    </div>
  );
}
