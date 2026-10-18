"use client";

import { LayoutGrid, LogOut, MoreHorizontal, Pencil, Plus, PowerOff, Share2, SlidersHorizontal, Trash, UserRound } from "lucide-react";
import { type MouseEvent, type ReactNode, useState } from "react";
import { Fab } from "@/components/layout/fab";
import { BottomNavBar, GroupBottomNavSkeleton } from "@/components/layout/group-nav";
import { GroupSwitcher } from "@/components/layout/group-switcher";
import { StackHeader } from "@/components/layout/stack-header";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { GroupCrest, type GroupCrestSize } from "@/components/shared/group-crest";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTrigger,
  SheetActionGroup,
  SheetActionItem,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ResponsiveMenu } from "@/components/ui/responsive-menu";

const DEMO_GROUPS = [
  { slug: "los-del-sabado", name: "Los del Sábado", playerCount: 18, role: "admin" as const },
  { slug: "futbol-5-jueves", name: "Fútbol 5 Jueves", playerCount: 10, role: "player" as const },
  { slug: "la-oficina-fc", name: "La Oficina FC", playerCount: 1, role: "admin" as const },
];

const CREST_SIZES: GroupCrestSize[] = ["xs", "sm", "md", "lg"];

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

function BottomNavDemo() {
  const [pathname, setPathname] = useState("/g/demo/jugadores");
  return (
    <div
      className="panel relative h-28 overflow-hidden rounded-xl"
      onClickCapture={(event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        if (!anchor) return;
        // Cambia la pestaña activa sin navegar, para ver la animación del indicador.
        event.preventDefault();
        event.stopPropagation();
        setPathname(new URL(anchor.href).pathname);
      }}
    >
      <BottomNavBar slug="demo" pathname={pathname} className="absolute lg:block" />
    </div>
  );
}

function SheetDemo({ onAction }: { onAction: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const run = (label: string) => {
    onAction(label);
    setOpen(false);
  };
  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        <Button variant="outline">Abrir hoja de acciones</Button>
      </BottomSheetTrigger>
      <BottomSheetContent title="Juan Cruz" description="Acciones de la ficha" showCancel>
        <div className="space-y-4">
          <SheetActionGroup label="Ficha">
            <SheetActionItem icon={Pencil} label="Editar ficha" onSelect={() => run("Editar ficha")} />
            <SheetActionItem
              icon={Share2}
              label="Invitar a vincular"
              description="Le mandás un link para que la reclame."
              onSelect={() => run("Invitar a vincular")}
            />
          </SheetActionGroup>
          <SheetActionGroup label="Zona de riesgo">
            <SheetActionItem
              icon={Trash}
              label="Eliminar ficha"
              destructive
              disabled
              description="Tiene partidos jugados: desactivalo para conservar su historial."
            />
          </SheetActionGroup>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function SheetWithFooterDemo() {
  return (
    <BottomSheet>
      <BottomSheetTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal aria-hidden="true" />
          Hoja con pie
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent
        title="Filtros"
        footer={
          <>
            <Button size="lg" className="w-full">
              Aplicar
            </Button>
            <Button size="lg" variant="ghost" className="w-full">
              Restablecer
            </Button>
          </>
        }
      >
        <div className="space-y-3 pb-2 text-sm text-muted-foreground">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="panel rounded-xl p-4">
              Opción de filtro {index + 1}
            </p>
          ))}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function PlayerMenuDemo() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <ResponsiveMenu
        title="Juan Cruz"
        trigger={
          <Button variant="ghost" size="icon" aria-label="Más acciones para Juan Cruz">
            <MoreHorizontal />
          </Button>
        }
        sections={[
          {
            items: [
              { key: "desactivar", label: "Desactivar", icon: PowerOff, onSelect: () => setConfirmOpen(true) },
              {
                key: "eliminar",
                label: "Eliminar ficha",
                icon: Trash,
                destructive: true,
                disabled: true,
                description: "Tiene partidos jugados: desactivalo para conservar su historial.",
              },
            ],
          },
        ]}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Desactivar a Juan Cruz?"
        description="Deja de aparecer en el plantel activo. Podés reactivarlo cuando quieras."
        confirmLabel="Desactivar"
        onConfirm={async () => ({ ok: true, message: "Jugador desactivado (demo)" })}
      />
    </>
  );
}

export function ChromeSection() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <section aria-labelledby="ui-kit-chrome" className="space-y-8">
      <header className="space-y-1">
        <h2 id="ui-kit-chrome" className="font-display text-display-md font-extrabold tracking-wide uppercase">
          Chrome
        </h2>
        <p className="text-sm text-muted-foreground">
          Barras, hojas y menús. Probalo a 375px (hojas inferiores) y a 1024px (dropdowns y pestañas).
        </p>
      </header>

      <Demo title="StackHeader" note="En mobile: volver + título que aparece al scrollear. En escritorio: miga de pan.">
        <div className="panel relative overflow-hidden rounded-xl px-4 pt-4 pb-6" onClickCapture={preventDemoNavigation}>
          <StackHeader
            backHref="/ui-kit"
            backLabel="Plantel"
            title="Juan Cruz"
            actions={
              <Button variant="ghost" size="icon" aria-label="Editar">
                <Pencil />
              </Button>
            }
          />
          <p className="mt-4 text-sm text-muted-foreground">Contenido de la pantalla…</p>
        </div>
      </Demo>

      <Demo title="Barra inferior" note="Tocá las pestañas: el indicador se desliza. Abajo, el esqueleto del shell.">
        <BottomNavDemo />
        <div className="panel relative h-24 overflow-hidden rounded-xl">
          <GroupBottomNavSkeleton className="absolute lg:block" />
        </div>
      </Demo>

      <Demo title="FAB extendido" note="Fijo sobre la barra inferior en mobile; acá, en línea.">
        <div onClickCapture={preventDemoNavigation}>
          <Fab href="/ui-kit" icon={Plus} label="Agregar" className="static lg:inline-flex" />
        </div>
      </Demo>

      <Demo title="StickyActionBar" note="Va dentro del <form>; en escritorio queda estática.">
        <div className="panel overflow-hidden rounded-xl px-4 pt-4">
          <p className="pb-4 text-sm text-muted-foreground">Campos del formulario…</p>
          <StickyActionBar className="grid grid-cols-[1fr_auto] gap-2">
            <Button size="lg" className="w-full">
              Guardar cambios
            </Button>
            <Button size="lg" variant="secondary">
              Y cargar otro
            </Button>
          </StickyActionBar>
        </div>
      </Demo>

      <Demo title="GroupCrest" note="xs · sm · md · lg (24/28/40/64px)">
        <div className="flex flex-wrap items-end gap-4">
          {CREST_SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <GroupCrest name="Los del Sábado" size={size} />
              <span className="text-2xs text-muted-foreground">{size}</span>
            </div>
          ))}
          {DEMO_GROUPS.map((group) => (
            <GroupCrest key={group.slug} name={group.name} size="md" />
          ))}
        </div>
      </Demo>

      <Demo title="BottomSheet" note="Arrastrá el asa o el título hacia abajo para cerrar (solo debajo de 640px).">
        <div className="flex flex-wrap items-center gap-3">
          <SheetDemo onAction={setLastAction} />
          <SheetWithFooterDemo />
        </div>
      </Demo>

      <Demo title="ResponsiveMenu" note="Hoja inferior debajo de 1024px, dropdown desde 1024px.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="panel max-w-64 rounded-xl px-3 py-1">
            <GroupSwitcher current={DEMO_GROUPS[0]} groups={DEMO_GROUPS} />
          </div>
          <ResponsiveMenu
            title="Tu cuenta"
            trigger={
              <button type="button" aria-label="Menú de cuenta" className="pressable grid size-11 place-items-center rounded-full">
                <UserAvatar name="Ana Brito" size="sm" />
              </button>
            }
            header={
              <div className="flex items-center gap-3">
                <UserAvatar name="Ana Brito" size="md" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">Ana Brito</p>
                  <p className="truncate text-xs text-muted-foreground">ana@ejemplo.com</p>
                </div>
              </div>
            }
            sections={[
              {
                items: [
                  { key: "grupos", label: "Mis grupos", icon: LayoutGrid, onSelect: () => setLastAction("Mis grupos") },
                  { key: "perfil", label: "Mi perfil", icon: UserRound, onSelect: () => setLastAction("Mi perfil") },
                ],
              },
              {
                items: [
                  {
                    key: "salir",
                    label: "Cerrar sesión",
                    icon: LogOut,
                    destructive: true,
                    onSelect: () => setLastAction("Cerrar sesión (demo)"),
                  },
                ],
              },
            ]}
          />
          <PlayerMenuDemo />
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Última acción: {lastAction ?? "ninguna"}
        </p>
      </Demo>
    </section>
  );
}
