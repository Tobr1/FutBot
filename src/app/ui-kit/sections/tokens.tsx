import { ChevronRight, Info } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { TIER_STYLES } from "@/components/shared/tier-styles";
import { POSITION_LABELS, POSITIONS } from "@/domain/players/positions";
import { overall, type RatingTier, TIER_LABELS, TIER_THRESHOLDS } from "@/domain/players/rating";

/*
 * Tokens de globals.css. Los contrastes son WCAG 2.x calculados sobre --background
 * (#050a15) salvo que se indique otra cosa.
 */

interface Swatch {
  token: string;
  value: string;
  usage: string;
  contrast?: string;
}

const COLOR_GROUPS: { title: string; description: string; swatches: Swatch[] }[] = [
  {
    title: "Superficies",
    description: "Del fondo hacia arriba, cada capa sube un escalón de luz.",
    swatches: [
      { token: "background", value: "oklch(0.145 0.025 262) · #050a15", usage: "surface-0: fondo y themeColor" },
      { token: "surface-1", value: "oklch(0.185 0.03 262)", usage: "Tarjetas y grupos de lista (card)" },
      { token: "surface-2", value: "oklch(0.22 0.032 262)", usage: "Popovers, sheets y toasts (popover)" },
      { token: "surface-3", value: "oklch(0.26 0.036 262)", usage: "Presionado, seleccionado, filas internas" },
      { token: "muted", value: "oklch(0.24 0.032 262)", usage: "Fondos apagados" },
      { token: "secondary", value: "oklch(0.25 0.035 262)", usage: "Botón secundario" },
      { token: "accent", value: "oklch(0.27 0.045 262)", usage: "Hover de menús" },
    ],
  },
  {
    title: "Bordes, foco y velo",
    description: "Hairline para separar; input más visible para campos; ring para el foco.",
    swatches: [
      { token: "hairline", value: "oklch(0.85 0.03 260 / 10%)", usage: "border, divisores, ring de paneles" },
      { token: "input", value: "oklch(0.8 0.04 260 / 30%)", usage: "Borde de campos" },
      { token: "ring", value: "oklch(0.75 0.15 250)", usage: "Anillo de foco", contrast: "8.8:1" },
      { token: "scrim", value: "oklch(0.09 0.02 262 / 72%)", usage: "Velo detrás de sheets y diálogos" },
    ],
  },
  {
    title: "Marca",
    description: "Un solo acento. Nunca bg-primary con texto blanco: para rellenos va primary-solid.",
    swatches: [
      { token: "primary", value: "oklch(0.66 0.19 256) · #3491ff", usage: "Texto, íconos, anillos, selección", contrast: "6.2:1 (5.9:1 sobre surface-1)" },
      { token: "primary-solid", value: "oklch(0.56 0.21 260) · #186bec", usage: "Rellenos con texto blanco", contrast: "Blanco encima 4.7:1" },
      { token: "primary-foreground", value: "oklch(0.99 0 0)", usage: "Texto sobre primary-solid", contrast: "19.2:1" },
    ],
  },
  {
    title: "Texto",
    description: "Cuerpo en foreground, captions en muted-foreground.",
    swatches: [
      { token: "foreground", value: "oklch(0.95 0.012 255)", usage: "Texto principal", contrast: "17.1:1" },
      { token: "muted-foreground", value: "oklch(0.7 0.03 258)", usage: "Captions, metadatos", contrast: "7.4:1 (6.5:1 sobre surface-2)" },
    ],
  },
  {
    title: "Resultados",
    description: "Verde gana, rojo pierde o destruye, dorado solo para MVP y premios.",
    swatches: [
      { token: "win", value: "oklch(0.77 0.17 155)", usage: "Victoria, positivo (= success)", contrast: "10.2:1" },
      { token: "draw", value: "oklch(0.72 0.02 258)", usage: "Empate", contrast: "8.0:1" },
      { token: "loss", value: "oklch(0.71 0.19 20)", usage: "Derrota, rival, destructivo (= destructive)", contrast: "6.9:1" },
      { token: "warning", value: "oklch(0.82 0.15 75)", usage: "Avisos, sin conexión", contrast: "11.1:1" },
      { token: "gold", value: "oklch(0.84 0.13 88)", usage: "MVP y premios", contrast: "12.1:1" },
    ],
  },
  {
    title: "Medallas",
    description: "Podios y rankings (1°, 2°, 3°).",
    swatches: [
      { token: "medal-1", value: "var(--gold)", usage: "Oro", contrast: "12.1:1" },
      { token: "medal-2", value: "oklch(0.82 0.01 250)", usage: "Plata", contrast: "11.4:1" },
      { token: "medal-3", value: "oklch(0.68 0.09 55)", usage: "Bronce", contrast: "6.7:1" },
    ],
  },
  {
    title: "Posiciones",
    description: "Tonos de categoría con poco croma: nunca significan ganar o perder.",
    swatches: [
      { token: "pos-gk", value: "oklch(0.78 0.13 55)", usage: "Arquero", contrast: "9.6:1" },
      { token: "pos-def", value: "oklch(0.78 0.10 210)", usage: "Defensor", contrast: "10.2:1" },
      { token: "pos-mid", value: "oklch(0.74 0.13 300)", usage: "Mediocampista", contrast: "8.2:1" },
      { token: "pos-fwd", value: "oklch(0.74 0.15 340)", usage: "Delantero", contrast: "8.0:1" },
    ],
  },
];

const TYPE_SCALE = [
  { label: "Hero · text-display-xl", className: "font-display text-display-xl font-extrabold tracking-wide uppercase", sample: "Los del sábado" },
  { label: "H1 · text-display-lg (sm: text-4xl)", className: "font-display text-display-lg font-extrabold tracking-wide uppercase", sample: "Plantel" },
  { label: "Sheet / hero · text-display-md", className: "font-display text-display-md font-extrabold tracking-wide uppercase", sample: "Filtros" },
  { label: "Número grande · text-stat-xl", className: "font-display text-stat-xl font-extrabold tabular", sample: "87" },
  { label: "Número · text-stat", className: "font-display text-stat font-extrabold tabular", sample: "24 · 9 · 14" },
  { label: "Sección · text-base semibold", className: "text-base font-semibold tracking-tight", sample: "Top del plantel" },
  { label: "Título de fila · 15px semibold", className: "text-[15px] font-semibold", sample: "Brito" },
  { label: "Cuerpo · text-sm", className: "text-sm", sample: "Elegí tu nombre: conservás tu historial y tus estadísticas." },
  { label: "Caption · text-xs muted", className: "text-xs text-muted-foreground", sample: "Ordenado por nivel inicial hasta que haya partidos." },
  { label: "Overline · text-2xs", className: "text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase", sample: "Tu ficha" },
] as const;

const RADII = [
  { className: "rounded-lg", label: "rounded-lg · 10px", usage: "Botones, inputs" },
  { className: "rounded-xl", label: "rounded-xl · 14px", usage: "Tarjetas, listas, tiles" },
  { className: "rounded-2xl", label: "rounded-2xl · 18px", usage: "Heroes" },
  { className: "rounded-3xl", label: "rounded-3xl · 22px", usage: "Esquinas de sheets" },
] as const;

const SHADOWS = [
  { className: "bg-surface-1 shadow-elev-1", label: "shadow-elev-1", usage: "panel" },
  { className: "bg-surface-2 shadow-elev-2", label: "shadow-elev-2", usage: "panel-raised, sheets" },
  { className: "bg-primary-solid shadow-glow", label: "shadow-glow", usage: "FAB y CTA principal" },
] as const;

/** Rango de valoración de carta (10-99) de cada tier, derivado de los umbrales del dominio. */
const TIER_RANGES: Record<RatingTier, string> = {
  promesa: `< ${overall(TIER_THRESHOLDS.titular)}`,
  titular: `${overall(TIER_THRESHOLDS.titular)}-${overall(TIER_THRESHOLDS.figura) - 1}`,
  figura: `${overall(TIER_THRESHOLDS.figura)}-${overall(TIER_THRESHOLDS.crack) - 1}`,
  crack: `${overall(TIER_THRESHOLDS.crack)}+`,
};

const TIERS: RatingTier[] = ["promesa", "titular", "figura", "crack"];

const LIST_ROWS = ["Miembros", "Temporadas", "Datos del grupo"] as const;

export function TokensSection() {
  return (
    <section aria-labelledby="ui-kit-tokens" className="space-y-10">
      <header className="space-y-1">
        <h2 id="ui-kit-tokens" className="font-display text-display-md font-extrabold tracking-wide uppercase">
          Tokens
        </h2>
        <p className="text-sm text-muted-foreground">Colores, tipografía, radios, sombras y utilidades de globals.css.</p>
      </header>

      <Block title="Colores">
        <div className="space-y-6">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <div>
                <h4 className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{group.title}</h4>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.swatches.map((swatch) => (
                  <SwatchTile key={swatch.token} swatch={swatch} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Tipografía" description="Barlow Condensed 700/800 solo para display y números; el resto, Inter. Nada debajo de 11px.">
        <ul className="list-group">
          {TYPE_SCALE.map((item) => (
            <li key={item.label} className="space-y-1.5 px-4 py-3">
              <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{item.label}</p>
              <p className={`${item.className} [overflow-wrap:anywhere]`}>{item.sample}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Radios" description="--radius 0.625rem: los demás se derivan de ahí.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADII.map((radius) => (
            <li key={radius.className} className="space-y-2">
              <div className={`h-20 bg-surface-2 ring-1 ring-hairline ${radius.className}`} />
              <p className="font-mono text-xs font-semibold">{radius.label}</p>
              <p className="text-xs text-muted-foreground">{radius.usage}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Sombras">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SHADOWS.map((shadow) => (
            <li key={shadow.label} className="space-y-2">
              <div className={`h-20 rounded-xl ring-1 ring-hairline ${shadow.className}`} />
              <p className="font-mono text-xs font-semibold">{shadow.label}</p>
              <p className="text-xs text-muted-foreground">{shadow.usage}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Utilidades" description="Nombres fijados: panel, panel-raised, list-group, pressable, pressable-row, hit-area, app-chrome, skeleton-shimmer.">
        <div className="grid gap-4 md:grid-cols-2">
          <Demo label="pressable · tocá y mantené">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="pressable inline-flex h-12 items-center rounded-xl bg-primary-solid px-5 font-semibold text-primary-foreground shadow-glow"
              >
                Crear jugador
              </button>
              <button
                type="button"
                className="pressable inline-flex h-10 items-center rounded-full border border-primary bg-primary/15 px-4 text-sm font-medium"
              >
                Chip activo
              </button>
            </div>
          </Demo>

          <Demo label="hit-area · objetivo de 44px (punteado)">
            <div className="flex items-center gap-6">
              <button
                type="button"
                aria-label="Más información"
                className="hit-area grid size-7 place-items-center rounded-md text-muted-foreground before:rounded-lg before:outline-1 before:outline-primary/60 before:outline-dashed"
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
              <p className="text-xs text-muted-foreground">Ícono de 28px con 8px de margen táctil invisible por lado.</p>
            </div>
          </Demo>

          <Demo label="panel / panel-raised">
            <div className="grid grid-cols-2 gap-3">
              <div className="panel rounded-xl p-4 text-sm">panel</div>
              <div className="panel-raised rounded-xl p-4 text-sm">panel-raised</div>
            </div>
          </Demo>

          <Demo label="list-group + pressable-row">
            <ul className="list-group">
              {LIST_ROWS.map((row) => (
                <li key={row}>
                  <button type="button" className="pressable-row flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] font-semibold">
                    <span className="flex-1">{row}</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Demo>

          <Demo label="skeleton-shimmer (estático con movimiento reducido)">
            {/* Sobre el fondo de página, como en las pantallas de carga. */}
            <div className="flex items-center gap-3 rounded-lg bg-background p-3" aria-hidden="true">
              <div className="size-11 shrink-0 rounded-full skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded-md skeleton-shimmer" />
                <div className="h-3 w-1/3 rounded-md skeleton-shimmer" />
              </div>
            </div>
          </Demo>

          <Demo label="animate-rise con escalonado (--i)">
            <ul className="flex flex-wrap gap-2">
              {["Inicio", "Partidos", "Plantel", "Rankings", "Más"].map((label, index) => (
                <li
                  key={label}
                  style={{ "--i": index } as CSSProperties}
                  className="animate-rise rounded-full bg-surface-3 px-3 py-1.5 text-xs font-medium [animation-delay:calc(min(var(--i),8)*35ms)]"
                >
                  {label}
                </li>
              ))}
            </ul>
          </Demo>

          <Demo label="glass y app-chrome">
            <div className="glass app-chrome rounded-xl p-4 text-sm">
              Chrome translúcido; no se selecciona el texto ni abre el menú al mantener.
            </div>
          </Demo>

          <Demo label="Ease y duraciones">
            <p className="text-xs text-muted-foreground">
              ease-out-quint (entradas, pressable) · ease-in-out-quart (slides) · 120ms toque · 150/210/360ms
              transiciones de pantalla · todo ≤ 400ms.
            </p>
          </Demo>
        </div>
      </Block>

      <Block title="Posiciones y tiers" description="data-pos expone --pos; los tiers de tarjeta dependen de la valoración.">
        <div className="space-y-4">
          <ul className="flex flex-wrap gap-2">
            {POSITIONS.map((position) => (
              <li
                key={position}
                data-pos={position}
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-display text-sm font-bold tracking-wider uppercase"
                style={{
                  color: "var(--pos)",
                  backgroundColor: "color-mix(in oklch, var(--pos) 16%, transparent)",
                  boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--pos) 32%, transparent)",
                }}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: "var(--pos)" }} aria-hidden="true" />
                {POSITION_LABELS[position].short}
                <span className="sr-only">{POSITION_LABELS[position].long}</span>
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIERS.map((tier) => (
              <li
                key={tier}
                className={`flex aspect-[4/3] flex-col justify-between rounded-xl bg-gradient-to-b p-3 ring-1 ring-white/10 ${TIER_STYLES[tier].card}`}
              >
                <span className={`font-display text-display-md font-extrabold tabular ${TIER_STYLES[tier].text}`}>
                  {TIER_RANGES[tier]}
                </span>
                <span className={`text-2xs font-semibold tracking-[0.12em] uppercase ${TIER_STYLES[tier].text}`}>
                  {TIER_LABELS[tier]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Block>
    </section>
  );
}

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="panel space-y-3 rounded-xl p-4">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function SwatchTile({ swatch }: { swatch: Swatch }) {
  return (
    <li className="panel min-w-0 overflow-hidden rounded-xl">
      {/* Fondo base debajo del swatch para que los tokens con alfa se vean como en la app. */}
      <div className="bg-background">
        <div className="h-12 border-b border-hairline" style={{ background: `var(--${swatch.token})` }} />
      </div>
      <div className="space-y-1 p-3">
        <p className="font-mono text-xs font-semibold break-all">--{swatch.token}</p>
        <p className="font-mono text-2xs text-muted-foreground break-all">{swatch.value}</p>
        <p className="text-xs leading-snug">{swatch.usage}</p>
        {swatch.contrast && <p className="text-2xs font-semibold text-muted-foreground tabular">Contraste {swatch.contrast}</p>}
      </div>
    </li>
  );
}
