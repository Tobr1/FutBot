import { Handshake, type LucideIcon, Swords, Target } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/shared/link-pending";
import { UserAvatar } from "@/components/shared/user-avatar";
import { type DuoRecord, type PairRecord, rateText, type Rivalries, recordText } from "@/domain/stats/rivalries";
import { cn } from "@/lib/utils";

export type NameMap = Record<string, { nickname: string; avatarUrl: string | null }>;

const ROW_LINK =
  "pressable-row relative flex min-h-16 items-center gap-3 px-4 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

const TONES = {
  win: { tile: "bg-win/12 text-win ring-win/25", value: "text-win" },
  loss: { tile: "bg-loss/12 text-loss ring-loss/25", value: "text-loss" },
} as const;

function RelationRow({
  label,
  icon: Icon,
  tone,
  record,
  players,
  href,
  detail,
}: {
  label: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  record: PairRecord;
  players: NameMap;
  href: string;
  detail: string;
}) {
  const name = players[record.playerId]?.nickname ?? "Jugador";
  return (
    <li>
      <Link href={href} transitionTypes={["nav-forward"]} className={ROW_LINK} aria-label={`${label}: ${name}. ${detail}. Comparar`}>
        <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset", TONES[tone].tile)}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</span>
          <span className="flex items-center gap-2">
            <UserAvatar name={name} src={players[record.playerId]?.avatarUrl} size="xs" />
            <span className="truncate text-[15px] font-semibold">{name}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground tabular">{detail}</span>
        </span>
        <span className={cn("shrink-0 font-display text-xl leading-none font-extrabold tabular", TONES[tone].value)}>{rateText(record.rate)}</span>
        <LinkPending />
      </Link>
    </li>
  );
}

/** "Duplas y rivales" de la ficha: socio ideal, rival favorito y némesis, con link al comparador. */
export function RivalsList({
  rivalries,
  players,
  compareHref,
}: {
  rivalries: Rivalries;
  players: NameMap;
  compareHref: (otherId: string) => string;
}) {
  const { partner, favoriteVictim, nemesis } = rivalries;
  return (
    <ul className="list-group" aria-label="Duplas y rivales">
      {partner && (
        <RelationRow
          label="Socio ideal"
          icon={Handshake}
          tone="win"
          record={partner}
          players={players}
          href={compareHref(partner.playerId)}
          detail={`${partner.matches} juntos · ${recordText(partner)}`}
        />
      )}
      {favoriteVictim && (
        <RelationRow
          label="Rival favorito"
          icon={Target}
          tone="win"
          record={favoriteVictim}
          players={players}
          href={compareHref(favoriteVictim.playerId)}
          detail={`${favoriteVictim.matches} en contra · ${recordText(favoriteVictim)}`}
        />
      )}
      {nemesis && (
        <RelationRow
          label="Némesis"
          icon={Swords}
          tone="loss"
          record={nemesis}
          players={players}
          href={compareHref(nemesis.playerId)}
          detail={`${nemesis.matches} en contra · ${recordText(nemesis)}`}
        />
      )}
    </ul>
  );
}

/** Ranking de duplas del grupo: efectividad jugando juntos. */
export function DuoRankingList({
  duos,
  players,
  compareHref,
}: {
  duos: DuoRecord[];
  players: NameMap;
  compareHref: (a: string, b: string) => string;
}) {
  return (
    <ol className="list-group" aria-label="Mejores duplas">
      {duos.map((duo, index) => {
        const [a, b] = duo.players.map((id) => ({ id, ...(players[id] ?? { nickname: "Jugador", avatarUrl: null }) }));
        return (
          <li key={duo.players.join("|")}>
            <Link href={compareHref(a.id, b.id)} transitionTypes={["nav-forward"]} className={ROW_LINK}>
              <span
                className={cn(
                  "w-5 shrink-0 text-center font-display text-lg font-extrabold tabular",
                  index === 0 ? "text-medal-1" : index === 1 ? "text-medal-2" : index === 2 ? "text-medal-3" : "text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span aria-hidden="true" className="flex shrink-0 -space-x-2">
                <UserAvatar name={a.nickname} src={a.avatarUrl} size="sm" className="ring-2 ring-surface-1" />
                <UserAvatar name={b.nickname} src={b.avatarUrl} size="sm" className="ring-2 ring-surface-1" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {a.nickname} y {b.nickname}
                </span>
                <span className="block truncate text-xs text-muted-foreground tabular">
                  {duo.matches} PJ · {recordText(duo)}
                </span>
              </span>
              <span className="shrink-0 font-display text-xl leading-none font-extrabold text-win tabular">{rateText(duo.rate)}</span>
              <LinkPending />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
