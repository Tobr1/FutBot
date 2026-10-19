"use client";

import { Link2, ListChecks, Trash2, Unlink2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { ChoiceCards } from "@/components/shared/choice-cards";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField, fieldAria, groupAria } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEAM_RULE_LABELS, TEAM_RULE_NOTE_MAX, type TeamRule, type TeamRuleKind } from "@/domain/matches/team-generator";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { type ActionState, idleState } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { createTeamRuleAction, deleteTeamRuleAction } from "../actions";
import { type PickablePlayer, PlayerPickSheet } from "./player-pick-sheet";

const KIND_ICON = { together: Link2, apart: Unlink2 } as const;

const KIND_OPTIONS = [
  { value: "together" as const, label: "Juntos", description: "Siempre en el mismo equipo" },
  { value: "apart" as const, label: "Separados", description: "Nunca en el mismo equipo" },
];

type RulePlayer = Pick<PickablePlayer, "nickname" | "avatarUrl">;

const ruleTitle = (rule: TeamRule, players: Readonly<Record<string, RulePlayer>>) =>
  `${players[rule.playerA]?.nickname ?? "Jugador"} y ${players[rule.playerB]?.nickname ?? "Jugador"}`;

/** Reglas "juntos / separados" en una lista; los admins pueden borrarlas. */
export function TeamRuleList({
  groupId,
  rules,
  players,
  canEdit,
  label = "Reglas de armado",
}: {
  groupId: string;
  rules: readonly TeamRule[];
  players: Readonly<Record<string, RulePlayer>>;
  canEdit: boolean;
  label?: string;
}) {
  return (
    <ul className="list-group" aria-label={label}>
      {rules.map((rule) => (
        <TeamRuleRow key={rule.id} groupId={groupId} rule={rule} players={players} canEdit={canEdit} />
      ))}
    </ul>
  );
}

function TeamRuleRow({
  groupId,
  rule,
  players,
  canEdit,
}: {
  groupId: string;
  rule: TeamRule;
  players: Readonly<Record<string, RulePlayer>>;
  canEdit: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const Icon = KIND_ICON[rule.kind];
  const title = ruleTitle(rule, players);
  const a = players[rule.playerA];
  const b = players[rule.playerB];

  return (
    <li className="flex min-h-16 items-center gap-3 py-2.5 pr-2 pl-4">
      <span aria-hidden="true" className="flex shrink-0 -space-x-2">
        <UserAvatar name={a?.nickname ?? "?"} src={a?.avatarUrl} size="sm" className="ring-2 ring-surface-1" />
        <UserAvatar name={b?.nickname ?? "?"} src={b?.avatarUrl} size="sm" className="ring-2 ring-surface-1" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Badge tone={rule.kind === "together" ? "primary" : "neutral"} size="sm" className="shrink-0">
            <Icon aria-hidden="true" />
            {TEAM_RULE_LABELS[rule.kind]}
          </Badge>
          {rule.note && <span className="truncate">{rule.note}</span>}
        </span>
      </span>
      {canEdit && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setConfirming(true)}
            aria-label={`Borrar la regla de ${title}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="¿Borrar la regla?"
            description={`${title} ya no van a quedar ${rule.kind === "together" ? "juntos" : "separados"} a la fuerza al generar equipos.`}
            confirmLabel="Borrar"
            onConfirm={() => deleteTeamRuleAction({ groupId, ruleId: rule.id })}
          />
        </>
      )}
    </li>
  );
}

/** Alta de una regla: dos jugadores, juntos o separados y una nota opcional. */
export function TeamRuleForm({
  groupId,
  players,
  idPrefix = "regla",
  className,
}: {
  groupId: string;
  players: readonly PickablePlayer[];
  /** Prefijo de ids (para tener dos formularios en la misma pantalla). */
  idPrefix?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [round, setRound] = useState(0);
  const [state, action] = useActionState(async (prev: ActionState, formData: FormData) => {
    const next = await createTeamRuleAction(prev, formData);
    // Guardada: campos en blanco para cargar otra.
    if (next.status === "success") setRound((r) => r + 1);
    return next;
  }, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={action} noValidate className={cn("grid gap-4", className)}>
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage state={state} />
      <RuleFields key={round} idPrefix={idPrefix} players={players} errors={errors} />
      <SubmitButton size="lg" pendingText="Guardando…" className="w-full sm:w-auto sm:justify-self-start">
        Guardar regla
      </SubmitButton>
    </form>
  );
}

function RuleFields({
  idPrefix,
  players,
  errors,
}: {
  idPrefix: string;
  players: readonly PickablePlayer[];
  errors?: Record<string, string[] | undefined>;
}) {
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [kind, setKind] = useState<TeamRuleKind | "">("");
  const [note, setNote] = useState("");
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <input type="hidden" name="playerA" value={playerA} />
      <input type="hidden" name="playerB" value={playerB} />
      <div className="grid grid-cols-2 gap-3">
        <FormField id={id("playerA")} label="Jugador" control="group" errors={errors?.playerA}>
          <PlayerPickSheet
            id={id("playerA")}
            label="Primer jugador"
            players={players}
            value={playerA}
            onChange={setPlayerA}
            exclude={playerB}
            invalid={Boolean(errors?.playerA)}
            describedBy={errors?.playerA ? `${id("playerA")}-error` : undefined}
          />
        </FormField>
        <FormField id={id("playerB")} label="Con" control="group" errors={errors?.playerB}>
          <PlayerPickSheet
            id={id("playerB")}
            label="Segundo jugador"
            players={players}
            value={playerB}
            onChange={setPlayerB}
            exclude={playerA}
            invalid={Boolean(errors?.playerB)}
            describedBy={errors?.playerB ? `${id("playerB")}-error` : undefined}
          />
        </FormField>
      </div>
      <FormField id={id("kind")} label="¿Cómo juegan?" control="group" errors={errors?.kind}>
        <ChoiceCards name="kind" value={kind} onChange={setKind} options={KIND_OPTIONS} columns="grid-cols-2" {...groupAria(id("kind"), errors?.kind)} />
      </FormField>
      <FormField id={id("note")} label="Nota (opcional)" hint="Por ejemplo: vienen juntos en auto." errors={errors?.note}>
        <Input
          {...fieldAria(id("note"), errors?.note, true)}
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={TEAM_RULE_NOTE_MAX}
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="done"
        />
      </FormField>
    </>
  );
}

/**
 * Acceso a las reglas desde el armado: las que aplican a este partido y el
 * alta rápida con los convocados. Las reglas valen para todo el grupo.
 */
export function TeamRulesSheet({
  groupId,
  rules,
  players,
  canEdit,
  rulesHref,
}: {
  groupId: string;
  /** Reglas con los dos jugadores convocados. */
  rules: readonly TeamRule[];
  players: readonly PickablePlayer[];
  canEdit: boolean;
  rulesHref: string;
}) {
  const [open, setOpen] = useState(false);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <ListChecks aria-hidden="true" />
        Reglas
        {rules.length > 0 && (
          <Badge tone="primary" size="sm" className="tabular">
            {rules.length}
          </Badge>
        )}
      </Button>
      <BottomSheetContent
        title="Reglas de armado"
        description="Se respetan al generar equipos y valen para todos los partidos del grupo."
        showCancel="Cerrar"
      >
        <div className="space-y-5 pb-2">
          <section aria-labelledby="reglas-partido" className="space-y-2">
            <h3 id="reglas-partido" className="px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Para este partido
            </h3>
            {rules.length === 0 ? (
              <p className="rounded-xl bg-surface-3/40 px-4 py-3 text-sm text-muted-foreground">
                Ninguna regla con jugadores de este partido.
              </p>
            ) : (
              <TeamRuleList groupId={groupId} rules={rules} players={byId} canEdit={canEdit} label="Reglas para este partido" />
            )}
          </section>
          {canEdit && (
            <section aria-labelledby="regla-nueva-partido" className="space-y-3">
              <h3 id="regla-nueva-partido" className="px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Nueva regla
              </h3>
              <TeamRuleForm groupId={groupId} players={players} idPrefix="regla-partido" />
            </section>
          )}
          <Link
            href={rulesHref}
            transitionTypes={["nav-forward"]}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver todas las reglas del grupo
          </Link>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
