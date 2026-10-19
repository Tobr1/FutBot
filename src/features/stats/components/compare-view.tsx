import { Swords, Users } from "lucide-react";
import Link from "next/link";
import { RatingPill } from "@/components/shared/player-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { CompareRow, HeadToHead, HeadToHeadText } from "@/domain/stats/head-to-head";
import { cn } from "@/lib/utils";

export interface CompareSide {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  href: string;
}

/** Encabezado del comparador: los dos jugadores enfrentados. */
export function CompareHeader({ a, b }: { a: CompareSide; b: CompareSide }) {
  const side = (p: CompareSide, align: "start" | "end") => (
    <Link
      href={p.href}
      transitionTypes={["nav-forward"]}
      className={cn(
        "pressable flex min-w-0 flex-1 flex-col gap-2 rounded-xl p-2 focus-visible:outline-2 focus-visible:outline-ring",
        align === "start" ? "items-start text-left" : "items-end text-right",
      )}
    >
      <UserAvatar name={p.nickname} src={p.avatarUrl} size="lg" />
      <span className="w-full truncate font-display text-xl leading-none font-extrabold tracking-wide uppercase">{p.nickname}</span>
      <RatingPill rating={p.rating} size="md" />
    </Link>
  );
  return (
    <div className="panel flex items-center gap-2 rounded-2xl p-2">
      {side(a, "start")}
      <span aria-hidden="true" className="shrink-0 font-display text-lg font-extrabold text-muted-foreground">
        VS
      </span>
      {side(b, "end")}
    </div>
  );
}

/** Estadísticas lado a lado; el mejor de cada fila queda resaltado. */
export function CompareTable({ rows, nameA, nameB }: { rows: CompareRow[]; nameA: string; nameB: string }) {
  return (
    <div className="panel overflow-hidden rounded-xl">
    <table className="w-full text-sm">
      <caption className="sr-only">
        Estadísticas de {nameA} y {nameB}
      </caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{nameA}</th>
          <th scope="col">Estadística</th>
          <th scope="col">{nameB}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {rows.map((row) => (
          <tr key={row.key} className="h-12">
            <td
              className={cn(
                "w-1/4 px-4 text-left font-display text-lg font-extrabold tabular",
                row.better === "a" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.better === "a" && <span aria-hidden="true" className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />}
              {row.a}
            </td>
            <th scope="row" className="px-2 text-center text-xs font-medium text-muted-foreground">
              {row.label}
            </th>
            <td
              className={cn(
                "w-1/4 px-4 text-right font-display text-lg font-extrabold tabular",
                row.better === "b" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.b}
              {row.better === "b" && <span aria-hidden="true" className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/** Cara a cara: juntos (resultado del equipo) y en contra (quién ganó más). */
export function HeadToHeadCard({ h2h, text, nameA, nameB }: { h2h: HeadToHead; text: HeadToHeadText; nameA: string; nameB: string }) {
  const total = h2h.aWins + h2h.bWins + h2h.draws;
  return (
    <div className="panel space-y-4 rounded-xl p-4">
      <p className="text-[15px] font-semibold">{text.headline}</p>

      {h2h.againstMatches > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Swords className="size-3.5" aria-hidden="true" />
            {text.against}
          </p>
          <div className="flex items-center justify-between font-display text-stat leading-none font-extrabold tabular">
            <span className={cn(h2h.aWins >= h2h.bWins ? "text-foreground" : "text-muted-foreground")}>
              {h2h.aWins}
              <span className="sr-only"> victorias de {nameA}</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {h2h.draws} {h2h.draws === 1 ? "empate" : "empates"}
            </span>
            <span className={cn(h2h.bWins >= h2h.aWins ? "text-foreground" : "text-muted-foreground")}>
              {h2h.bWins}
              <span className="sr-only"> victorias de {nameB}</span>
            </span>
          </div>
          {total > 0 && (
            <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-surface-3">
              <span className="bg-primary" style={{ width: `${(h2h.aWins / total) * 100}%` }} />
              <span className="bg-draw/60" style={{ width: `${(h2h.draws / total) * 100}%` }} />
              <span className="bg-foreground/50" style={{ width: `${(h2h.bWins / total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {text.together && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          {text.together}
        </p>
      )}
    </div>
  );
}
