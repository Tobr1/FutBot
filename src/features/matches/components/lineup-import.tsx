"use client";

import { AlertTriangle, Check, ClipboardPaste, RotateCcw, Sparkles, UserPlus } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type LineupHeader, matchLineup, parseLineup } from "@/domain/lineup-import";
import {
  initialReview,
  NICKNAME_MAX,
  type ResolvedReview,
  resolveReview,
  type ReviewDecision,
  reviewIssues,
  reviewProgress,
  type ReviewRow,
  type RosterRef,
} from "@/domain/matches/import-review";
import { cn } from "@/lib/utils";

const PLACEHOLDER = `Fútbol sábado 22 hs ⚽
1. Juanchi
2. Manu
3. Vece 🧤
…
Suplentes:
1. Toto`;

export interface ImportRosterPlayer extends RosterRef {
  isActive?: boolean;
}

/** Chip de decisión (botón con estado presionado). */
function DecisionChip({
  pressed,
  onClick,
  children,
  tone = "default",
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "pressable inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm font-medium pointer-coarse:h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed
          ? "border-primary bg-primary/15 text-foreground"
          : cn("border-hairline", tone === "muted" ? "text-muted-foreground" : "text-foreground"),
      )}
    >
      {pressed && <Check className="size-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

function ReviewRowItem({
  row,
  issue,
  nickname,
  onDecide,
}: {
  row: ReviewRow;
  issue?: string;
  nickname: (id: string) => string;
  onDecide: (decision: ReviewDecision) => void;
}) {
  const [expanded, setExpanded] = useState(row.suggestion !== "matched");
  const d = row.decision;
  const autoMatched = row.suggestion === "matched" && d.kind === "existing" && !expanded;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{row.name}</span>
            {row.section === "reserve" && (
              <Badge tone="warning" size="sm">
                Suplente
              </Badge>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {d.kind === "existing" && (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                {nickname(d.playerId)}
              </span>
            )}
            {d.kind === "new" && (
              <span className="inline-flex items-center gap-1 text-primary">
                <UserPlus className="size-3.5" aria-hidden="true" />
                Ficha nueva
              </span>
            )}
            {d.kind === "ignore" && "No se convoca"}
            {d.kind === "pending" &&
              (row.suggestion === "new" ? "No está en el plantel" : "¿Quién es? Elegí una opción")}
          </span>
        </span>
        {autoMatched && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-primary"
            aria-label={`Cambiar a quién corresponde ${row.name}`}
          >
            Cambiar
          </button>
        )}
      </div>

      {!autoMatched && (
        <div role="group" aria-label={`Opciones para ${row.name}`} className="flex flex-wrap gap-2">
          {row.candidates.map((candidate) => (
            <DecisionChip
              key={candidate.id}
              pressed={d.kind === "existing" && d.playerId === candidate.id}
              onClick={() => onDecide({ kind: "existing", playerId: candidate.id })}
            >
              {candidate.nickname}
            </DecisionChip>
          ))}
          <DecisionChip
            pressed={d.kind === "new"}
            onClick={() => onDecide({ kind: "new", nickname: row.name.slice(0, NICKNAME_MAX) })}
          >
            {row.candidates.length > 0 ? "Es nuevo" : "Crear ficha"}
          </DecisionChip>
          <DecisionChip tone="muted" pressed={d.kind === "ignore"} onClick={() => onDecide({ kind: "ignore" })}>
            Ignorar
          </DecisionChip>
        </div>
      )}

      {d.kind === "new" && (
        <Input
          value={d.nickname}
          onChange={(e) => onDecide({ kind: "new", nickname: e.target.value })}
          maxLength={NICKNAME_MAX}
          aria-label={`Apodo de la ficha nueva para ${row.name}`}
          aria-invalid={Boolean(issue) || undefined}
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="done"
        />
      )}

      {issue && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {issue}
        </p>
      )}
    </li>
  );
}

/**
 * Pegar una lista de WhatsApp y revisarla. Se interpreta en el navegador
 * contra el plantel; lo dudoso exige elegir, lo nuevo exige crear ficha o
 * ignorar. Nada se guarda hasta que el admin crea el partido.
 */
export function LineupImport({
  roster,
  onApply,
}: {
  roster: ImportRosterPlayer[];
  onApply: (result: ResolvedReview & { header: LineupHeader; rememberAliases: boolean }) => void;
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [header, setHeader] = useState<LineupHeader | null>(null);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [remember, setRemember] = useState(true);

  const names = useMemo(() => new Map(roster.map((p) => [p.id, p.nickname])), [roster]);
  const issues = useMemo(() => (rows ? reviewIssues(rows, roster) : new Map<string, string>()), [rows, roster]);
  const progress = rows ? reviewProgress(rows) : null;
  const convoked = progress ? progress.existing + progress.created : 0;
  const canApply = Boolean(progress && progress.pending === 0 && issues.size === 0 && convoked > 0);

  function review() {
    const parsed = parseLineup(text);
    setHeader(parsed.header);
    setIgnoredCount(parsed.ignored.length);
    setRows(initialReview(matchLineup(parsed.entries, roster)));
  }

  function decide(key: string, decision: ReviewDecision) {
    setRows((current) => current?.map((row) => (row.key === key ? { ...row, decision } : row)) ?? null);
  }

  function apply() {
    if (!rows || !header || !canApply) return;
    onApply({ ...resolveReview(rows, roster), header, rememberAliases: remember });
  }

  if (!rows) {
    return (
      <div className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Lista de WhatsApp"
          rows={8}
          className="min-h-48 font-mono text-sm"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          Copiá el mensaje del grupo y pegalo tal cual: reconocemos numeración, emojis, suplentes y bajas.
        </p>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={review} disabled={!text.trim()}>
          <ClipboardPaste aria-hidden="true" />
          Revisar lista
        </Button>
      </div>
    );
  }

  const hints = [header?.dayHint, header?.timeHint && `${header.timeHint} h`].filter(Boolean).join(" · ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <Badge tone="success">{progress?.existing ?? 0} convocados</Badge>
        {(progress?.created ?? 0) > 0 && <Badge tone="primary">{progress?.created} fichas nuevas</Badge>}
        {(progress?.pending ?? 0) > 0 && <Badge tone="warning">{progress?.pending} para revisar</Badge>}
        {ignoredCount + (progress?.ignored ?? 0) > 0 && (
          <Badge tone="neutral">{ignoredCount + (progress?.ignored ?? 0)} ignorados</Badge>
        )}
      </div>
      {hints && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          En la lista dice: {hints}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="panel rounded-xl p-4 text-sm text-muted-foreground">
          No encontramos nombres en el texto. Revisá que sea la lista del partido.
        </p>
      ) : (
        <ul className="list-group" aria-label="Revisión de la lista">
          {rows.map((row) => (
            <ReviewRowItem
              key={row.key}
              row={row}
              issue={issues.get(row.key)}
              nickname={(id) => names.get(id) ?? "—"}
              onDecide={(decision) => decide(row.key, decision)}
            />
          ))}
        </ul>
      )}

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-5 shrink-0 accent-[var(--primary-solid)]"
        />
        Recordar los nombres que elegí para la próxima lista
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button type="button" size="lg" onClick={apply} disabled={!canApply}>
          {progress && progress.pending > 0 ? `Faltan ${progress.pending} por revisar` : `Usar esta lista (${convoked})`}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={() => {
            setRows(null);
            setHeader(null);
          }}
          aria-label="Volver a pegar la lista"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
