"use client";

import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Ellipsis,
  EllipsisVertical,
  Lock,
  Share,
  SquarePlus,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import type { InstallGuide } from "@/lib/pwa/platform";
import { cn } from "@/lib/utils";
import { promptInstall } from "./install-store";

type ManualGuide = Exclude<InstallGuide, "prompt">;

/** Dónde apunta la flecha de ayuda al cerrar la guía. */
type PointerTarget = "bottom-center" | "top-right";

interface GuideContent {
  title: string;
  description: string;
  /** Aviso previo (p. ej. si se abrió desde WhatsApp). */
  hint?: string;
  steps: Array<{ title: string; text: string; art: ReactNode }>;
  /** Mostrar "Copiar link" para abrirlo en otro navegador. */
  copyLink?: boolean;
  pointer?: PointerTarget;
  pointerLabel?: string;
}

// ── Ilustraciones: imitan la pantalla real con el control a tocar resaltado ──

/** Dominio real de la app (la guía solo se renderiza en el cliente). */
function appHost(): string {
  return typeof window === "undefined" ? "fulbot" : window.location.host;
}

function Highlight({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("relative grid place-items-center", className)}>
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-primary/25 motion-safe:animate-ping" />
      <span className="relative grid size-9 place-items-center rounded-full bg-primary-solid text-primary-foreground ring-2 ring-primary/50">
        {children}
      </span>
    </span>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="grid size-9 place-items-center text-muted-foreground/70">{children}</span>;
}

/** Barra inferior de Safari en iPhone con Compartir resaltado. */
function SafariBottomBar() {
  return (
    <div className="rounded-2xl bg-surface-3 px-2 py-2 ring-1 ring-hairline">
      <div className="mb-2 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-surface-1 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        {appHost()}
      </div>
      <div className="flex items-center justify-around">
        <Muted>
          <ChevronLeft className="size-5" />
        </Muted>
        <Muted>
          <ChevronRight className="size-5" />
        </Muted>
        <Highlight>
          <Share className="size-[18px]" />
        </Highlight>
        <Muted>
          <BookOpen className="size-5" />
        </Muted>
        <Muted>
          <Copy className="size-5" />
        </Muted>
      </div>
    </div>
  );
}

/** Barra superior (iPad o Chrome de iPhone) con un control resaltado a la derecha. */
function TopAddressBar({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface-3 px-2 py-2 ring-1 ring-hairline">
      <div className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-1 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        {appHost()}
      </div>
      <Highlight>{icon}</Highlight>
    </div>
  );
}

/** Menú con una opción resaltada (hoja de Compartir o menú del navegador). */
function MenuMock({ rows, highlight }: { rows: Array<{ label: string; icon: ReactNode }>; highlight: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-3 ring-1 ring-hairline">
      {rows.map((row, index) => {
        const active = index === highlight;
        return (
          <div
            key={row.label}
            className={cn(
              "flex h-10 items-center justify-between px-3 text-sm",
              index > 0 && "border-t border-hairline",
              active ? "bg-primary/15 font-semibold text-foreground ring-2 ring-primary ring-inset" : "text-muted-foreground",
            )}
          >
            {row.label}
            <span className={active ? "text-primary" : ""}>{row.icon}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Pantalla de confirmación "Agregar a inicio" con el botón resaltado. */
function ConfirmMock({ action }: { action: string }) {
  return (
    <div className="rounded-2xl bg-surface-3 p-3 ring-1 ring-hairline">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Cancelar</span>
        <span className="relative">
          <span aria-hidden="true" className="absolute -inset-1.5 rounded-lg bg-primary/25 motion-safe:animate-ping" />
          <span className="relative rounded-lg bg-primary-solid px-2.5 py-1 font-semibold text-primary-foreground">{action}</span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <LogoMark className="size-11 rounded-xl" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">FulBot</p>
          <p className="truncate text-xs text-muted-foreground">{appHost()}</p>
        </div>
      </div>
    </div>
  );
}

const SHARE_ROWS = [
  { label: "Copiar", icon: <Copy className="size-4" aria-hidden="true" /> },
  { label: "Agregar a favoritos", icon: <BookOpen className="size-4" aria-hidden="true" /> },
  { label: "Agregar a inicio", icon: <SquarePlus className="size-4" aria-hidden="true" /> },
];

const SAFARI_FINISH = {
  title: "En Safari: Compartir → “Agregar a inicio”",
  text: "Ahí seguís los mismos pasos que en un iPhone.",
  art: <MenuMock rows={SHARE_ROWS} highlight={2} />,
};

function guideContent(guide: ManualGuide): GuideContent {
  switch (guide) {
    case "ios-safari":
      return {
        title: "Instalá FulBot",
        description: "Queda en tu pantalla de inicio y abre a pantalla completa, como cualquier app.",
        hint: "¿Lo abriste desde WhatsApp? Primero tocá la brújula de Safari, abajo a la derecha.",
        steps: [
          {
            title: "Tocá Compartir",
            text: "El cuadrado con la flecha hacia arriba, en la barra de abajo. Si no lo ves, tocá ··· y después Compartir.",
            art: <SafariBottomBar />,
          },
          {
            title: "Elegí “Agregar a inicio”",
            text: "Si no aparece, deslizá el menú hacia arriba para ver más opciones.",
            art: <MenuMock rows={SHARE_ROWS} highlight={2} />,
          },
          { title: "Tocá “Agregar”", text: "Listo: el escudo de FulBot queda en tu pantalla de inicio.", art: <ConfirmMock action="Agregar" /> },
        ],
        pointer: "bottom-center",
        pointerLabel: "Compartir está acá abajo",
      };
    case "ipad-safari":
      return {
        title: "Instalá FulBot",
        description: "Queda en tu pantalla de inicio y abre a pantalla completa.",
        steps: [
          {
            title: "Tocá Compartir",
            text: "El cuadrado con la flecha hacia arriba, arriba a la derecha, al lado de la dirección.",
            art: <TopAddressBar icon={<Share className="size-[18px]" />} />,
          },
          { title: "Elegí “Agregar a inicio”", text: "Si no aparece, deslizá el menú para ver más opciones.", art: <MenuMock rows={SHARE_ROWS} highlight={2} /> },
          { title: "Tocá “Agregar”", text: "Listo: queda en tu pantalla de inicio.", art: <ConfirmMock action="Agregar" /> },
        ],
        pointer: "top-right",
        pointerLabel: "Compartir está acá arriba",
      };
    case "ios-chrome":
      return {
        title: "Instalá FulBot",
        description: "Chrome también la agrega a tu pantalla de inicio.",
        steps: [
          {
            title: "Tocá Compartir",
            text: "En la barra de direcciones, arriba a la derecha.",
            art: <TopAddressBar icon={<Share className="size-[18px]" />} />,
          },
          {
            title: "Elegí “Agregar a pantalla de inicio”",
            text: "Si no aparece, deslizá el menú hacia arriba.",
            art: (
              <MenuMock
                rows={[
                  { label: "Copiar", icon: <Copy className="size-4" aria-hidden="true" /> },
                  { label: "Agregar a pantalla de inicio", icon: <SquarePlus className="size-4" aria-hidden="true" /> },
                ]}
                highlight={1}
              />
            ),
          },
          { title: "Tocá “Agregar”", text: "Listo: queda en tu pantalla de inicio.", art: <ConfirmMock action="Agregar" /> },
        ],
        pointer: "top-right",
        pointerLabel: "Compartir está acá arriba",
      };
    case "ios-other":
      return {
        title: "Abrila en Safari",
        description: "En iPhone, la forma más fácil de instalarla es desde Safari.",
        steps: [
          { title: "Copiá el link", text: "Con el botón de abajo.", art: <CopyArt /> },
          { title: "Abrí Safari y pegalo", text: "Tocá la barra de direcciones, “Pegar y abrir”.", art: <TopAddressBar icon={<Compass className="size-[18px]" />} /> },
          SAFARI_FINISH,
        ],
        copyLink: true,
      };
    case "in-app-ios":
      return {
        title: "Abrila en Safari",
        description: "Desde esta app no se puede instalar: primero abrila en el navegador.",
        steps: [
          { title: "Tocá ··· arriba a la derecha", text: "Es el menú de la app en la que estás.", art: <TopAddressBar icon={<Ellipsis className="size-[18px]" />} /> },
          {
            title: "Elegí “Abrir en Safari”",
            text: "A veces dice “Abrir en el navegador”. Si no aparece, copiá el link y pegalo en Safari.",
            art: (
              <MenuMock
                rows={[
                  { label: "Copiar enlace", icon: <Copy className="size-4" aria-hidden="true" /> },
                  { label: "Abrir en Safari", icon: <Compass className="size-4" aria-hidden="true" /> },
                ]}
                highlight={1}
              />
            ),
          },
          SAFARI_FINISH,
        ],
        copyLink: true,
        pointer: "top-right",
        pointerLabel: "El menú está acá arriba",
      };
    case "in-app-android":
      return {
        title: "Abrila en Chrome",
        description: "Desde esta app no se puede instalar: primero abrila en el navegador.",
        steps: [
          { title: "Tocá ⋮ arriba a la derecha", text: "Es el menú de la app en la que estás.", art: <TopAddressBar icon={<EllipsisVertical className="size-[18px]" />} /> },
          {
            title: "Elegí “Abrir en Chrome”",
            text: "A veces dice “Abrir en el navegador”. Si no aparece, copiá el link y pegalo en Chrome.",
            art: (
              <MenuMock
                rows={[
                  { label: "Copiar enlace", icon: <Copy className="size-4" aria-hidden="true" /> },
                  { label: "Abrir en Chrome", icon: <Compass className="size-4" aria-hidden="true" /> },
                ]}
                highlight={1}
              />
            ),
          },
          { title: "Tocá “Instalar app”", text: "En Chrome te aparece la tarjeta de FulBot con el botón.", art: <ConfirmMock action="Instalar" /> },
        ],
        copyLink: true,
        pointer: "top-right",
        pointerLabel: "El menú está acá arriba",
      };
    case "android-manual":
      return {
        title: "Instalá FulBot",
        description: "Queda en tu pantalla de inicio y abre a pantalla completa.",
        steps: [
          { title: "Tocá ⋮ arriba a la derecha", text: "Es el menú del navegador.", art: <TopAddressBar icon={<EllipsisVertical className="size-[18px]" />} /> },
          {
            title: "Elegí “Instalar app”",
            text: "En algunos celulares dice “Agregar a la pantalla principal”.",
            art: (
              <MenuMock
                rows={[
                  { label: "Compartir", icon: <Share className="size-4" aria-hidden="true" /> },
                  { label: "Instalar app", icon: <SquarePlus className="size-4" aria-hidden="true" /> },
                ]}
                highlight={1}
              />
            ),
          },
          { title: "Confirmá con “Instalar”", text: "Listo: queda junto a tus otras apps.", art: <ConfirmMock action="Instalar" /> },
        ],
        pointer: "top-right",
        pointerLabel: "El menú está acá arriba",
      };
  }
}

function CopyArt() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface-3 px-3 py-2.5 text-sm ring-1 ring-hairline">
      <Copy className="size-4 text-primary" aria-hidden="true" />
      <span className="truncate text-muted-foreground">{appHost()}</span>
    </div>
  );
}

async function copyAppLink() {
  const url = window.location.origin;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado: pegalo en el navegador.");
  } catch {
    toast.message(`Copiá este link: ${url}`);
  }
}

// ── Flecha de ayuda ────────────────────────────────────────────────────────

/** Flecha que rebota señalando dónde está Compartir o el menú. Se va sola o al tocarla. */
function InstallPointer({ target, label, onDone }: { target: PointerTarget; label: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 12_000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const bottom = target === "bottom-center";
  const Arrow = bottom ? ArrowDown : ArrowUp;

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label={`${label}. Cerrar ayuda`}
      className={cn(
        "fixed z-[60] flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-semibold text-primary-foreground",
        bottom
          ? "bottom-[max(0.75rem,var(--safe-bottom))] left-1/2 -translate-x-1/2 flex-col"
          : "top-[calc(var(--safe-top)+0.5rem)] right-2 flex-col-reverse",
      )}
    >
      <span className="rounded-xl bg-primary-solid px-3 py-2 whitespace-nowrap shadow-elev-2">{label}</span>
      <Arrow className="size-9 text-primary drop-shadow-[0_2px_8px_rgb(0_0_0/0.6)] motion-safe:animate-bounce" aria-hidden="true" />
    </button>
  );
}

// ── Hoja con la guía ───────────────────────────────────────────────────────

export function InstallGuideSheet({
  guide,
  open,
  onOpenChange,
}: {
  guide: ManualGuide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const content = guideContent(guide);
  const [pointerOn, setPointerOn] = useState(false);

  function finish() {
    onOpenChange(false);
    if (content.pointer) setPointerOn(true);
  }

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent
          title={content.title}
          description={content.description}
          footer={
            <div className="grid gap-2">
              {content.copyLink && (
                <Button type="button" variant="secondary" size="lg" className="w-full" onClick={copyAppLink}>
                  <Copy aria-hidden="true" />
                  Copiar link
                </Button>
              )}
              <Button type="button" size="lg" className="w-full" onClick={finish}>
                {content.pointer ? "Entendido, mostrame dónde" : "Entendido"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {content.hint && (
              <p className="flex items-start gap-2 rounded-xl bg-warning/12 px-3 py-2.5 text-sm text-warning ring-1 ring-warning/25">
                <Compass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {content.hint}
              </p>
            )}
            <ol className="space-y-5">
              {content.steps.map((step, index) => (
                <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-3 gap-y-2">
                  <span className="grid size-8 place-items-center rounded-full bg-primary/15 font-display text-lg font-extrabold text-primary tabular">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug font-semibold">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
                  </div>
                  <div aria-hidden="true" className="col-start-2">
                    {step.art}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </BottomSheetContent>
      </BottomSheet>

      {pointerOn && content.pointer && (
        <InstallPointer target={content.pointer} label={content.pointerLabel ?? "Acá"} onDone={() => setPointerOn(false)} />
      )}
    </>
  );
}

/**
 * Arranca la instalación: en Android/escritorio abre el diálogo nativo
 * directamente; en el resto (iPhone, navegadores internos) abre la guía.
 */
export function useInstallLauncher(guide: InstallGuide | null) {
  const [open, setOpen] = useState(false);
  const [fallback, setFallback] = useState<ManualGuide | null>(null);

  async function start() {
    if (guide === "prompt") {
      const shown = await promptInstall();
      // Si el navegador ya no ofrece el diálogo, mostramos los pasos del menú.
      if (!shown) {
        setFallback("android-manual");
        setOpen(true);
      }
      return;
    }
    setOpen(true);
  }

  const manualGuide: ManualGuide | null = guide === "prompt" ? fallback : guide;
  const sheet = manualGuide ? <InstallGuideSheet guide={manualGuide} open={open} onOpenChange={setOpen} /> : null;

  return { start, sheet };
}

