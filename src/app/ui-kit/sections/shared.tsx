"use client";

import { CalendarDays, Hand, KeyRound, LineChart, LogOut, Search, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type MouseEvent, type ReactNode, useRef, useState } from "react";
import { ChoiceCards } from "@/components/shared/choice-cards";
import { ComingSoon } from "@/components/shared/coming-soon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { FormField, groupAria } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PageHeader } from "@/components/shared/page-header";
import { PasswordInput } from "@/components/shared/password-input";
import { PlayerCard, type PlayerCardData, RatingPill } from "@/components/shared/player-card";
import { PlayerRow, type PlayerRowData } from "@/components/shared/player-row";
import { POSITION_COLOR_VAR, PositionBadge } from "@/components/shared/position-badge";
import { RecordBar } from "@/components/shared/record-bar";
import { SectionHeader } from "@/components/shared/section-header";
import {
  CardGridSkeleton,
  FilterBarSkeleton,
  FormSkeleton,
  HeroSkeleton,
  ListGroupSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  ScreenSkeleton,
  StatStripSkeleton,
} from "@/components/shared/skeletons";
import { StatStrip } from "@/components/shared/stat-strip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { POSITION_LABELS, POSITIONS, type Position } from "@/domain/players/positions";
import { ShareInvite } from "@/features/invitations/components/share-invite";
import { InvitePlayerCard } from "@/features/players/components/invite-player-card";
import { effectiveness } from "@/domain/players/stats";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { type ActionState, errorState, idleState, successState } from "@/lib/action-result";
import { ok } from "@/lib/mutation-result";

/** Evita que los links de las demos naveguen (rutas de ejemplo). */
function preventDemoNavigation(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) event.preventDefault();
}

function Demo({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

const DEMO_ROWS: (PlayerRowData & { id: string })[] = [
  {
    id: "1",
    nickname: "Juan Cruz",
    fullName: "Juan Cruz Medina",
    rating: 8.4,
    primaryPosition: "forward",
    stats: { matches: 21, goals: 17, assists: 6 },
  },
  { id: "2", nickname: "Tano", rating: 7.1, primaryPosition: "midfielder", stats: { matches: 18, goals: 5, assists: 9 } },
  { id: "3", nickname: "Ruso", rating: 6.0, primaryPosition: "defender", stats: { matches: 12, goals: 1, assists: 2 } },
  {
    id: "4",
    nickname: "Maximiliano Gutiérrez",
    rating: 4.2,
    primaryPosition: "goalkeeper",
    isActive: false,
    stats: { matches: 3, goals: 0, assists: 0 },
  },
];

const DEMO_CARDS: { width: string; note: string; player: PlayerCardData; showFullName?: boolean }[] = [
  {
    width: "w-[158px]",
    note: "158px · crack, provisional",
    player: {
      nickname: "Juan Cruz",
      fullName: "Juan Cruz Medina",
      rating: 8.4,
      primaryPosition: "forward",
      isProvisional: true,
      stats: { matches: 2, goals: 3, assists: 1 },
    },
  },
  {
    width: "w-[165px]",
    note: "165px · figura, sin cuenta, apodo largo",
    player: {
      nickname: "Maximiliano Gutiérrez",
      fullName: "Maximiliano Gutiérrez",
      rating: 7.1,
      primaryPosition: "goalkeeper",
      isLinked: false,
      stats: { matches: 128, goals: 14, assists: 102 },
    },
  },
  {
    width: "w-[280px]",
    note: "280px · titular, con nombre completo",
    player: {
      nickname: "Ruso",
      fullName: "Sebastián Ivanov",
      rating: 6.0,
      primaryPosition: "defender",
      stats: { matches: 12, goals: 1, assists: 2 },
    },
  },
  {
    width: "w-[6.5rem]",
    note: "104px · promesa, sin stats (vista previa del formulario)",
    showFullName: false,
    player: { nickname: "Pibe", rating: 4.2, primaryPosition: "midfielder" },
  },
];

const DEMO_RECORD = { matches: 12, wins: 7, draws: 2, losses: 3 };

type PositionFilter = "all" | Position | "inactive";

function MatchesPreview() {
  return (
    <div className="space-y-2">
      {["Sáb 12", "Sáb 19"].map((date) => (
        <div key={date} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
          <span className="rounded-md bg-primary/15 px-2 py-1 text-2xs font-semibold text-primary uppercase">{date}</span>
          <span className="size-6 rounded-[28%_28%_46%_46%] bg-white/15" />
          <span className="flex-1 text-center font-display text-xl font-extrabold">– : –</span>
          <span className="size-6 rounded-[28%_28%_46%_46%] bg-white/15" />
        </div>
      ))}
    </div>
  );
}

export function SharedSection() {
  const [primary, setPrimary] = useState<Position | "">("midfielder");
  const [secondary, setSecondary] = useState<Position | "">("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [formState, setFormState] = useState<ActionState>(idleState);
  const [filter, setFilter] = useState<PositionFilter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useFormErrorFocus(formRef, formState);

  function onDemoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitted(`principal="${data.get("principal")}" · secundaria="${data.get("secundaria")}"`);
    setFormState(
      data.get("secundaria")
        ? successState("Guardado (demo).")
        : errorState("Revisá los datos marcados.", { fieldErrors: { secundaria: ["Elegí una posición secundaria (demo)."] } }),
    );
  }

  const secondaryErrors = formState.status === "error" ? formState.fieldErrors?.secundaria : undefined;

  const counts = Object.fromEntries(POSITIONS.map((p) => [p, DEMO_ROWS.filter((r) => r.primaryPosition === p).length]));

  return (
    <section aria-labelledby="ui-kit-shared" className="space-y-8" onClickCapture={preventDemoNavigation}>
      <header className="space-y-1">
        <h2 id="ui-kit-shared" className="font-display text-display-md font-extrabold tracking-wide uppercase">
          Componentes compartidos
        </h2>
        <p className="text-sm text-muted-foreground">
          Bloques de contenido de src/components/shared. Probalos a 375px y con el teclado (flechas en tarjetas y chips).
        </p>
      </header>

      <Demo title="ShareInvite" note="Link de invitación largo dentro de un panel: se recorta con … y no ensancha la pantalla.">
        <div className="panel max-w-md rounded-xl p-4">
          <ShareInvite
            url="https://fut-bot-seven.vercel.app/invitacion/e6eca6ea8efa46b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5"
            message="Sumate a &quot;Fútbol de los changos&quot; en FulBot:"
          />
        </div>
      </Demo>
      <Demo title="InvitePlayerCard" note="Ficha sin cuenta (admin): recién creada, la pregunta va resaltada.">
        <div className="grid max-w-md gap-3">
          <InvitePlayerCard groupId="00000000-0000-4000-8000-000000000001" groupName="Los del Sábado" playerId="00000000-0000-4000-8000-000000000002" nickname="Juanchi" fresh />
          <InvitePlayerCard groupId="00000000-0000-4000-8000-000000000001" groupName="Los del Sábado" playerId="00000000-0000-4000-8000-000000000003" nickname="Boni" />
        </div>
      </Demo>
      <Demo title="PageHeader" note="Una sola fila; en mobile la acción secundaria es un ícono.">
        <div className="panel rounded-xl p-4">
          <PageHeader
            id="ui-kit-page-header-demo"
            eyebrow="Temporada 2026"
            title="Plantel"
            description="18 activos. La descripción se corta en dos líneas en el teléfono y se ve completa desde sm."
            actions={
              <Button variant="secondary" size="icon" aria-label="Buscar">
                <Search />
              </Button>
            }
          />
        </div>
      </Demo>

      <Demo title="SectionHeader + ListGroup / ListRow" note="Filas de 56px con estado presionado; las que navegan muestran el velo pendiente.">
        <div className="space-y-3">
          <SectionHeader title="Cuenta" count={4} action={{ label: "Ver todo", href: "/ui-kit#cuenta" }} />
          <ListGroup label="Cuenta">
            <ListRow
              href="/ui-kit#perfil"
              transitionTypes={["nav-forward"]}
              leading={<UserAvatar name="Juan Cruz" size="md" />}
              title="Mi perfil"
              subtitle="Nombre, foto y contraseña"
              chevron
            />
            <ListRow
              leading={<Users className="size-5 text-muted-foreground" aria-hidden="true" />}
              title="Miembros"
              trailing={<span className="text-sm text-muted-foreground tabular">12</span>}
            />
            <ListRow
              asChild
              leading={<KeyRound className="size-5 text-muted-foreground" aria-hidden="true" />}
              title="Fila con botón (asChild)"
              subtitle="Abre un ConfirmDialog controlado"
              chevron
            >
              <button type="button" onClick={() => setConfirmOpen(true)} />
            </ListRow>
            <ListRow
              asChild
              destructive
              leading={<LogOut className="size-5 text-destructive" aria-hidden="true" />}
              title="Cerrar sesión"
            >
              <button type="button" onClick={() => setConfirmOpen(true)} />
            </ListRow>
          </ListGroup>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            destructive={false}
            title="¿Sos Juan Cruz?"
            description="La ficha y todas sus estadísticas quedan vinculadas a tu cuenta."
            confirmLabel="Sí, soy yo"
            onConfirm={async () => {
              await new Promise((resolve) => setTimeout(resolve, 700));
              return ok("Listo, quedó vinculada.");
            }}
          />
        </div>
      </Demo>

      <Demo title="PlayerRow" note="Puestos 1-3 con color de medalla; la fila 4 está inactiva.">
        <div className="space-y-3">
          <SectionHeader title="Top del plantel" action={{ label: "Ver plantel", href: "/ui-kit#plantel" }} />
          <ListGroup ordered label="Top del plantel">
            {DEMO_ROWS.map((player, index) => (
              <PlayerRow key={player.id} player={player} rank={index + 1} href={`/ui-kit#jugador-${player.id}`} />
            ))}
          </ListGroup>
          <ListGroup label="Sin link ni stats">
            <PlayerRow
              player={{ nickname: "Chino", fullName: "Martín Ferreyra", rating: 7.6, primaryPosition: null }}
              trailing={<Button size="sm" variant="secondary">Soy yo</Button>}
            />
          </ListGroup>
        </div>
      </Demo>

      <Demo title="PlayerCard" note="Escala con el ancho (cqw): a 158 y 165px la fila PJ/G/A entra completa.">
        <div className="flex flex-wrap items-start gap-4">
          {DEMO_CARDS.map((card) => (
            <figure key={card.note} className={`${card.width} shrink-0 space-y-1.5`}>
              <PlayerCard player={card.player} showFullName={card.showFullName} headingLevel="p" />
              <figcaption className="text-2xs text-muted-foreground">{card.note}</figcaption>
            </figure>
          ))}
        </div>
      </Demo>

      <Demo title="RatingPill y PositionBadge" note="Las posiciones usan matices propios (nunca verde, rojo ni ámbar).">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["sm", "md", "lg"] as const).map((size) => (
              <div key={size} className="flex items-center gap-2">
                <RatingPill rating={4.2} size={size} />
                <RatingPill rating={6.0} size={size} />
                <RatingPill rating={7.1} size={size} />
                <RatingPill rating={8.4} size={size} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {POSITIONS.map((position) => (
              <PositionBadge key={`${position}-sm`} position={position} size="sm" />
            ))}
            {POSITIONS.map((position) => (
              <PositionBadge key={`${position}-md`} position={position} />
            ))}
            {POSITIONS.map((position) => (
              <PositionBadge key={`${position}-long`} position={position} variant="long" />
            ))}
            <PositionBadge position="forward" muted />
          </div>
        </div>
      </Demo>

      <Demo title="StatStrip y RecordBar">
        <div className="space-y-4">
          <StatStrip
            items={[
              { label: "PJ", srLabel: "Partidos jugados", value: DEMO_RECORD.matches },
              { label: "Goles", value: 7, tone: "primary" },
              { label: "Asist.", srLabel: "Asistencias", value: 3 },
              { label: "MVP", value: 2, tone: "gold" },
              {
                label: "%Vic",
                srLabel: "Efectividad",
                value: `${effectiveness(DEMO_RECORD) ?? "—"}%`,
                tone: "success",
              },
            ]}
          />
          <RecordBar wins={DEMO_RECORD.wins} draws={DEMO_RECORD.draws} losses={DEMO_RECORD.losses} />
          <RecordBar wins={0} draws={0} losses={0} />
        </div>
      </Demo>

      <Demo title="EmptyState" note="sm es una fila; md y lg son bloques con brillo radial (sin borde punteado).">
        <div className="space-y-4">
          <EmptyState
            size="sm"
            icon={LineChart}
            title="Muy pronto"
            description="Vas a ver tu evolución partido a partido."
          />
          <EmptyState
            size="sm"
            tone="neutral"
            icon={Search}
            title="Sin resultados"
            description="Probá con otro nombre o quitá filtros."
            action={
              <Button size="sm" variant="ghost">
                Limpiar
              </Button>
            }
          />
          <EmptyState
            icon={Users}
            title="Plantel vacío"
            description="Cargá a los jugadores del grupo para empezar."
            action={<Button>Agregar jugadores</Button>}
          />
          <EmptyState size="lg" tone="gold" icon={Trophy} title="Sin premios todavía" description="El MVP se vota después de cada partido." />
        </div>
      </Demo>

      <Demo title="ComingSoon" note="La vista previa es inerte y está atenuada.">
        <ComingSoon
          icon={CalendarDays}
          title="Partidos en camino"
          description="Próximos partidos, resultados e historial."
          preview={<MatchesPreview />}
          items={[
            "Crear partidos con fecha, hora, cancha y formato.",
            "Pegar la lista de WhatsApp y reconocer a cada jugador.",
            "Equipos parejos en un toque.",
          ]}
        />
      </Demo>

      <Demo
        title="ChoiceCards + FormField"
        note="Flechas para moverse (marca al moverse). Sin selección, el formulario envía cadena vacía."
      >
        <form ref={formRef} onSubmit={onDemoSubmit} className="grid gap-5">
          <FormField id="principal" label="Posición principal" control="group">
            <ChoiceCards
              name="principal"
              value={primary}
              onChange={(value) => {
                setPrimary(value);
                if (value && value === secondary) setSecondary("");
              }}
              columns="grid-cols-4"
              size="lg"
              clearLabel="Sin posición"
              {...groupAria("principal")}
              options={POSITIONS.map((position) => ({
                value: position,
                label: <span className="font-display text-lg font-bold">{POSITION_LABELS[position].short}</span>,
                description: POSITION_LABELS[position].long,
                descriptionClassName: "hidden sm:block",
                accent: POSITION_COLOR_VAR[position],
              }))}
            />
          </FormField>
          <FormField
            id="secundaria"
            label="Posición secundaria"
            control="group"
            hint="Enviá sin elegir para ver el foco en el error."
            errors={secondaryErrors}
          >
            <ChoiceCards
              name="secundaria"
              value={secondary}
              onChange={setSecondary}
              columns="grid-cols-4"
              size="lg"
              clearLabel="Sin posición"
              {...groupAria("secundaria", secondaryErrors, true)}
              options={POSITIONS.map((position) => ({
                value: position,
                label: <span className="font-display text-lg font-bold">{POSITION_LABELS[position].short}</span>,
                accent: POSITION_COLOR_VAR[position],
                disabled: position === primary,
                disabledReason: position === primary ? "Es la principal" : undefined,
              }))}
            />
          </FormField>
          <FormField
            id="demo-password"
            label="Contraseña"
            aside={
              <Link href="/ui-kit#recuperar" className="inline-flex min-h-11 items-center text-xs text-primary">
                ¿La olvidaste?
              </Link>
            }
          >
            <PasswordInput id="demo-password" name="demo-password" autoComplete="off" />
          </FormField>
          <FormMessage state={formState} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg">
              Enviar
            </Button>
            {submitted && <p className="text-xs text-muted-foreground tabular">Enviado: {submitted}</p>}
          </div>
        </form>
      </Demo>

      <Demo title="FilterChips" note="Flechas para moverse, Espacio para elegir. El chip activo se centra al montar.">
        <FilterChips
          label="Filtrar por posición"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "Todos", count: DEMO_ROWS.length },
            ...POSITIONS.map((position) => ({
              value: position,
              label: POSITION_LABELS[position].long,
              count: counts[position],
              dot: POSITION_COLOR_VAR[position],
            })),
            { value: "inactive", label: "Inactivos", count: 1 },
          ]}
        />
      </Demo>

      <Demo title="ConfirmDialog" note="Abajo en el teléfono, centrado desde sm. Queda abierto mientras corre la acción.">
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            trigger={
              <Button variant="destructive">
                <LogOut aria-hidden="true" />
                Salir del grupo
              </Button>
            }
            title="¿Salir de Los del Sábado?"
            description="Dejás de ver el grupo. Tu ficha y tus estadísticas quedan en el plantel por si volvés."
            confirmLabel="Salir"
            onConfirm={async () => {
              await new Promise((resolve) => setTimeout(resolve, 900));
              return ok("Saliste del grupo (demo).");
            }}
          />
          <ConfirmDialog
            trigger={
              <Button variant="secondary">
                <Hand aria-hidden="true" />
                Soy yo
              </Button>
            }
            destructive={false}
            title="¿Sos Tano?"
            description="La ficha queda vinculada a tu cuenta."
            confirmLabel="Sí, soy yo"
            onConfirm={async () => ok()}
          />
        </div>
      </Demo>

      <Demo title="Esqueletos" note="Misma forma que los bloques reales; ScreenSkeleton anuncia «Cargando…» una sola vez.">
        <ScreenSkeleton className="space-y-6">
          <PageHeaderSkeleton eyebrow action />
          <div className="overflow-hidden rounded-xl px-4 pt-4 ring-1 ring-hairline">
            <HeroSkeleton variant="group" />
          </div>
          <div className="overflow-hidden rounded-xl px-4 pt-6 ring-1 ring-hairline">
            <HeroSkeleton variant="player" />
          </div>
          <StatStripSkeleton />
          <ListGroupSkeleton rows={3} />
          <ListGroupSkeleton rows={2} avatar={false} trailing={false} />
          <div className="overflow-hidden rounded-xl px-4 ring-1 ring-hairline">
            <FilterBarSkeleton />
          </div>
          <CardGridSkeleton count={4} />
          <FormSkeleton fields={2} />
          <ListSkeleton rows={2} />
        </ScreenSkeleton>
        <div className="mt-6 rounded-xl p-4 ring-1 ring-hairline">
          <PageSkeleton variant="cards" />
        </div>
      </Demo>
    </section>
  );
}
