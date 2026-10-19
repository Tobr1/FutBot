"use client";

import { AlertTriangle, History, Loader2, Plus, Star, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { UserAvatar } from "@/components/shared/user-avatar";
import { BottomSheet, BottomSheetContent, SheetActionGroup, SheetActionItem } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  checkResult,
  clampScore,
  draftToEvents,
  otherSide,
  type ResultCheck,
  type ResultDraft,
  type Side,
} from "@/domain/matches/result";
import { cn } from "@/lib/utils";
import { recordResultAction } from "../actions";
import { Stepper } from "./stepper";

export interface ResultTeamMember {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface ResultTeam {
  name: string;
  members: ResultTeamMember[];
}

const SIDE_TEXT: Record<Side, string> = { a: "text-team-a", b: "text-team-b" };
const SIDE_DOT: Record<Side, string> = { a: "bg-team-a", b: "bg-team-b" };

/** Mensajes de validación en castellano, por equipo. */
export function resultMessages(check: ResultCheck, teams: Record<Side, ResultTeam>): string[] {
  const messages: string[] = [];
  for (const side of ["a", "b"] as const) {
    const c = check[side];
    if (c.goalsExceedScore) {
      messages.push(`${teams[side].name}: hay ${c.credited} goles asignados y el marcador dice ${c.score}.`);
    }
    if (c.assistsExceedGoals) {
      messages.push(`${teams[side].name}: hay ${c.assists} asistencias y solo ${c.playerGoals} goles de sus jugadores.`);
    }
  }
  if (check.issues.some((i) => i.kind === "player_not_in_match" || i.kind === "own_goal_wrong_team")) {
    messages.push("Hay goles de jugadores que ya no están en ese equipo: revisalos.");
  }
  return messages;
}

/**
 * Carga o corrección del resultado: marcador con steppers grandes, goles y
 * asistencias por jugador, goles en contra, destacado y notas. Valida en
 * vivo lo mismo que la base (goles asignados ≤ marcador, asistencias ≤
 * goles por equipo); los goles sin autor se permiten.
 */
export function ResultEditor({
  groupId,
  matchId,
  teams,
  initial,
  initialMvp,
  initialNotes,
  isCorrection,
}: {
  groupId: string;
  matchId: string;
  teams: Record<Side, ResultTeam>;
  initial: ResultDraft;
  initialMvp: string | null;
  initialNotes: string;
  isCorrection: boolean;
}) {
  const [draft, setDraft] = useState<ResultDraft>(initial);
  const [mvp, setMvp] = useState<string | null>(initialMvp);
  const [notes, setNotes] = useState(initialNotes);
  const [mvpOpen, setMvpOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sideById = useMemo(() => {
    const map = new Map<string, Side>();
    for (const side of ["a", "b"] as const) for (const m of teams[side].members) map.set(m.id, side);
    return map;
  }, [teams]);
  const memberById = useMemo(
    () => new Map([...teams.a.members, ...teams.b.members].map((m) => [m.id, m])),
    [teams],
  );

  const check = checkResult(draft, (id) => sideById.get(id) ?? null);
  const messages = resultMessages(check, teams);

  const setScore = (side: Side, value: number) =>
    setDraft((d) => (side === "a" ? { ...d, scoreA: clampScore(value) } : { ...d, scoreB: clampScore(value) }));
  const setCount = (kind: "goals" | "assists", playerId: string, value: number) =>
    setDraft((d) => ({ ...d, [kind]: { ...d[kind], [playerId]: Math.max(0, value) } }));

  function save() {
    if (!check.valid || isPending) return;
    startTransition(async () => {
      const result = await recordResultAction({
        groupId,
        matchId,
        scoreA: draft.scoreA,
        scoreB: draft.scoreB,
        events: draftToEvents(draft),
        mvpPlayerId: mvp,
        notes,
      });
      if (!result.ok) toast.error(result.message);
    });
  }

  const mvpPlayer = mvp ? memberById.get(mvp) : undefined;

  return (
    <div className="space-y-6">
      {/* Marcador */}
      <section aria-label="Marcador" className="panel rounded-2xl px-3 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          {(["a", "b"] as const).map((side, index) => (
            <div key={side} className={cn("flex flex-col items-center gap-2", index === 1 && "col-start-3")}>
              <p className={cn("flex max-w-full items-center gap-1.5 font-display text-lg leading-none font-extrabold tracking-wide uppercase", SIDE_TEXT[side])}>
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", SIDE_DOT[side])} />
                <span className="truncate">{teams[side].name}</span>
              </p>
              <Stepper
                size="xl"
                tone={side === "a" ? "team-a" : "team-b"}
                label={`goles de ${teams[side].name}`}
                value={side === "a" ? draft.scoreA : draft.scoreB}
                onChange={(value) => setScore(side, value)}
              />
              <p
                className={cn(
                  "text-xs tabular",
                  check[side].goalsExceedScore ? "font-semibold text-destructive" : "text-muted-foreground",
                )}
              >
                {check[side].goalsExceedScore
                  ? `${check[side].credited} asignados`
                  : check[side].unassigned > 0
                    ? `${check[side].unassigned} sin autor`
                    : "Todos con autor"}
              </p>
            </div>
          ))}
          <span aria-hidden="true" className="col-start-2 row-start-1 self-center pt-6 font-display text-3xl font-extrabold text-muted-foreground">
            –
          </span>
        </div>
      </section>

      {/* Goles y asistencias por equipo */}
      {(["a", "b"] as const).map((side) => {
        const rival = otherSide(side);
        const ownGoals = draft.ownGoals.map((og, index) => ({ ...og, index })).filter((og) => og.beneficiary === side);
        return (
          <section key={side} aria-labelledby={`goles-${side}`} className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <h2 id={`goles-${side}`} className={cn("flex items-center gap-2 text-base font-semibold tracking-tight", SIDE_TEXT[side])}>
                <span aria-hidden="true" className={cn("size-2 rounded-full", SIDE_DOT[side])} />
                {teams[side].name}
              </h2>
              <div aria-hidden="true" className="hidden shrink-0 gap-3 pr-4 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:flex">
                <span className="w-[7.5rem] text-center">Goles</span>
                <span className="w-[7.5rem] text-center">Asist.</span>
              </div>
            </div>
            <ul className="list-group">
              {teams[side].members.map((member) => (
                <li key={member.id} className="px-4 py-2 sm:flex sm:min-h-14 sm:items-center sm:gap-3 sm:py-1.5">
                  <span className="flex min-w-0 items-center gap-2 sm:flex-1">
                    <UserAvatar name={member.nickname} src={member.avatarUrl} size="xs" />
                    <span className="min-w-0 truncate text-[15px] font-semibold">{member.nickname}</span>
                    {mvp === member.id && <Star className="size-3.5 shrink-0 fill-current text-gold" aria-label="Destacado" />}
                  </span>
                  {/* En el teléfono, los dos contadores van en una segunda línea con su etiqueta. */}
                  <div className="mt-1.5 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:gap-3">
                    {(["goals", "assists"] as const).map((kind) => (
                      <div
                        key={kind}
                        className="flex items-center justify-between gap-1 rounded-xl bg-surface-2/60 pl-3 sm:w-[7.5rem] sm:justify-center sm:bg-transparent sm:pl-0"
                      >
                        <span aria-hidden="true" className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:hidden">
                          {kind === "goals" ? "Goles" : "Asist."}
                        </span>
                        <Stepper
                          label={`${kind === "goals" ? "goles" : "asistencias"} de ${member.nickname}`}
                          value={draft[kind][member.id] ?? 0}
                          onChange={(value) => setCount(kind, member.id, value)}
                        />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
              {ownGoals.map((og) => (
                <li key={`og-${og.index}`} className="flex min-h-14 items-center gap-2 py-1.5 pr-2 pl-4">
                  <Label htmlFor={`og-${og.index}`} className="shrink-0 text-sm text-muted-foreground">
                    En contra de
                  </Label>
                  <select
                    id={`og-${og.index}`}
                    value={og.playerId ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        ownGoals: d.ownGoals.map((item, i) => (i === og.index ? { ...item, playerId: e.target.value || null } : item)),
                      }))
                    }
                    className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-secondary/60 px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  >
                    <option value="">Sin autor</option>
                    {teams[rival].members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nickname} ({teams[rival].name})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, ownGoals: d.ownGoals.filter((_, i) => i !== og.index) }))}
                    aria-label="Quitar gol en contra"
                    className="pressable grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, ownGoals: [...d.ownGoals, { beneficiary: side, playerId: null }] }))}
              className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-medium text-primary"
            >
              <Plus className="size-4" aria-hidden="true" />
              Gol en contra a favor de {teams[side].name}
            </button>
          </section>
        );
      })}

      {/* Destacado */}
      <section aria-labelledby="destacado" className="space-y-2">
        <h2 id="destacado" className="text-base font-semibold tracking-tight">
          Destacado <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </h2>
        <BottomSheet open={mvpOpen} onOpenChange={setMvpOpen}>
          <button
            type="button"
            onClick={() => setMvpOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              "panel pressable flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-2 text-left",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              mvpPlayer && "bg-gold/10 ring-gold/25",
            )}
          >
            <Star className={cn("size-5 shrink-0", mvpPlayer ? "fill-current text-gold" : "text-muted-foreground")} aria-hidden="true" />
            {mvpPlayer ? (
              <>
                <UserAvatar name={mvpPlayer.nickname} src={mvpPlayer.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{mvpPlayer.nickname}</span>
                <span className="text-sm text-primary">Cambiar</span>
              </>
            ) : (
              <span className="flex-1 text-[15px] text-muted-foreground">Elegir al mejor del partido</span>
            )}
          </button>
          <BottomSheetContent title="Destacado" description="Si después hay votación, el MVP sale de los votos." showCancel>
            <div className="space-y-4 pb-2">
              {(["a", "b"] as const).map((side) => (
                <SheetActionGroup key={side} label={teams[side].name}>
                  {teams[side].members.map((m) => (
                    <SheetActionItem
                      key={m.id}
                      leading={<UserAvatar name={m.nickname} src={m.avatarUrl} size="sm" />}
                      label={m.nickname}
                      trailing={mvp === m.id ? <Star className="size-4 fill-current text-gold" aria-label="Elegido" /> : undefined}
                      onSelect={() => {
                        setMvp(m.id);
                        setMvpOpen(false);
                      }}
                    />
                  ))}
                </SheetActionGroup>
              ))}
              {mvp && (
                <SheetActionGroup>
                  <SheetActionItem
                    icon={X}
                    label="Sin destacado"
                    onSelect={() => {
                      setMvp(null);
                      setMvpOpen(false);
                    }}
                  />
                </SheetActionGroup>
              )}
            </div>
          </BottomSheetContent>
        </BottomSheet>
      </section>

      <section className="grid gap-2">
        <Label htmlFor="result-notes">Notas (opcional)</Label>
        <Textarea
          id="result-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Ej.: se jugó con uno menos el segundo tiempo"
          autoCapitalize="sentences"
        />
      </section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <History className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {isCorrection
          ? "Estás corrigiendo un resultado: el cambio queda en el registro de cambios del grupo."
          : "Si después hay que corregirlo, se puede: cada corrección queda registrada."}
      </p>

      <StickyActionBar className="space-y-2">
        {messages.length > 0 && (
          <div role="alert" className="space-y-1">
            {messages.map((message) => (
              <p key={message} className="flex items-start gap-1.5 text-xs font-medium text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {message}
              </p>
            ))}
          </div>
        )}
        <Button
          type="button"
          size="lg"
          className="w-full lg:w-auto"
          onClick={save}
          disabled={!check.valid || isPending}
          aria-busy={isPending || undefined}
        >
          {isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
          {isPending ? "Guardando…" : isCorrection ? "Guardar corrección" : "Guardar resultado"}
        </Button>
      </StickyActionBar>
    </div>
  );
}
