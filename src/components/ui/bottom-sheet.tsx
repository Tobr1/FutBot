"use client";

import type { LucideIcon } from "lucide-react";
import { animate, useDragControls, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import { Dialog as SheetPrimitive, Slot } from "radix-ui";
import {
  type ComponentProps,
  createContext,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { useIsSmUp, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { SHEET_DISMISS, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Hoja inferior propia sobre el Dialog de Radix (foco, escape, scroll lock y
 * aria vienen de Radix) más arrastre con motion para cerrarla tirando hacia
 * abajo. Debajo de `sm` se ancla abajo y se arrastra desde el asa o el
 * encabezado; desde `sm` es un diálogo centrado sin arrastre.
 */

interface BottomSheetContextValue {
  open: boolean;
  close: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

/** Estado de la hoja más cercana: `close()` sirve para cerrar desde una fila. */
export function useBottomSheet(): BottomSheetContextValue {
  const context = useContext(BottomSheetContext);
  if (!context) throw new Error("BottomSheetContent y useBottomSheet tienen que estar dentro de <BottomSheet>.");
  return context;
}

export function BottomSheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <BottomSheetContext.Provider value={value}>
      <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </SheetPrimitive.Root>
    </BottomSheetContext.Provider>
  );
}

export function BottomSheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />;
}

export function BottomSheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="bottom-sheet-close" {...props} />;
}

export interface BottomSheetContentProps {
  /** Título accesible (y visible salvo `hideHeader`). */
  title: ReactNode;
  description?: ReactNode;
  /** Oculta título y descripción a la vista (quedan para lectores de pantalla). */
  hideHeader?: boolean;
  /** Bloque extra en el encabezado (debajo del título, o solo si `hideHeader`). */
  header?: ReactNode;
  footer?: ReactNode;
  /** Agrega la fila "Cancelar" al final; un string cambia el texto. */
  showCancel?: boolean | string;
  /** false: no se cierra con escape, tocando afuera ni arrastrando. */
  dismissible?: boolean;
  className?: string;
  children?: ReactNode;
  onCloseAutoFocus?: (event: Event) => void;
}

export function BottomSheetContent({
  title,
  description,
  hideHeader = false,
  header,
  footer,
  showCancel = false,
  dismissible = true,
  className,
  children,
  onCloseAutoFocus,
}: BottomSheetContentProps) {
  const { open, close } = useBottomSheet();
  const isSmUp = useIsSmUp();
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const canDrag = !isSmUp && dismissible;

  // Si se cerró arrastrando, la hoja quedó fuera de pantalla: vuelve a 0 antes de pintarse.
  useLayoutEffect(() => {
    if (open) y.jump(0);
  }, [open, y]);

  const startDrag = (event: ReactPointerEvent) => {
    if (canDrag) dragControls.start(event);
  };

  const handleDragEnd = (_event: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > SHEET_DISMISS.offset || info.velocity.y > SHEET_DISMISS.velocity) {
      if (reducedMotion) {
        close();
        return;
      }
      animate(y, window.innerHeight, { duration: 0.2 }).then(close);
      return;
    }
    animate(y, 0, reducedMotion ? { duration: 0 } : SPRING.sheet);
  };

  const cancelLabel = typeof showCancel === "string" ? showCancel : "Cancelar";
  const showHeaderBox = !hideHeader || Boolean(header);
  const hasFooter = Boolean(footer) || Boolean(showCancel);

  const titleNode = (
    <SheetPrimitive.Title
      className={cn("font-display text-display-md font-extrabold tracking-wide text-balance uppercase", hideHeader && "sr-only")}
    >
      {title}
    </SheetPrimitive.Title>
  );
  const descriptionNode = description ? (
    <SheetPrimitive.Description className={cn("mt-1 text-sm text-muted-foreground", hideHeader && "sr-only")}>
      {description}
    </SheetPrimitive.Description>
  ) : null;

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="bottom-sheet-overlay"
        className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <SheetPrimitive.Content
        data-slot="bottom-sheet-content"
        {...(description ? {} : { "aria-describedby": undefined })}
        onEscapeKeyDown={dismissible ? undefined : (event) => event.preventDefault()}
        onPointerDownOutside={dismissible ? undefined : (event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 outline-none",
          "duration-300 ease-out-quint data-open:animate-in data-closed:animate-out data-closed:duration-200",
          "max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95",
        )}
      >
        <m.div
          style={{ y }}
          drag={canDrag ? "y" : false}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-popover text-popover-foreground shadow-elev-2 ring-1 ring-hairline",
            "sm:max-h-[min(85dvh,44rem)] sm:rounded-2xl",
            className,
          )}
        >
          {dismissible ? (
            <div
              aria-hidden="true"
              onPointerDown={startDrag}
              className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing sm:hidden"
            >
              <span className="h-1.5 w-10 rounded-full bg-white/20" />
            </div>
          ) : (
            <div aria-hidden="true" className="h-4 shrink-0 sm:hidden" />
          )}

          {showHeaderBox ? (
            <div onPointerDown={startDrag} className={cn("shrink-0 px-5 pt-1 pb-3 sm:pt-5", canDrag && "touch-none")}>
              {titleNode}
              {descriptionNode}
              {header ? <div className={cn(!hideHeader && "mt-3")}>{header}</div> : null}
            </div>
          ) : (
            <>
              {titleNode}
              {descriptionNode}
            </>
          )}

          <div
            data-slot="bottom-sheet-body"
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4",
              !showHeaderBox && "sm:pt-4",
              hasFooter ? "pb-1" : "pb-[max(1rem,var(--safe-bottom))]",
            )}
          >
            {children}
          </div>

          {hasFooter ? (
            <div
              data-slot="bottom-sheet-footer"
              className={cn(
                "flex shrink-0 flex-col gap-2 px-4 pt-3 pb-[max(1rem,var(--safe-bottom))]",
                footer ? "border-t border-hairline" : null,
              )}
            >
              {footer}
              {showCancel ? (
                <SheetPrimitive.Close asChild>
                  <Button type="button" variant="secondary" size="lg" className="h-12 w-full">
                    {cancelLabel}
                  </Button>
                </SheetPrimitive.Close>
              ) : null}
            </div>
          ) : null}
        </m.div>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

/** Bloque de filas de acción con un overline opcional. */
export function SheetActionGroup({ label, children, className }: { label?: ReactNode; children: ReactNode; className?: string }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={label ? labelId : undefined} className={cn("space-y-2", className)}>
      {label ? (
        <p id={labelId} className="px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      <ul className="divide-y divide-hairline overflow-hidden rounded-xl bg-surface-3/40">{children}</ul>
    </div>
  );
}

export interface SheetActionItemProps {
  icon?: LucideIcon;
  /** Reemplaza al ícono (p. ej. un escudo o un avatar). */
  leading?: ReactNode;
  label: ReactNode;
  /** Siempre visible, también deshabilitada: sirve para explicar el motivo. */
  description?: ReactNode;
  trailing?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  /** La fila se renderiza sobre su hijo (p. ej. un <Link>). */
  asChild?: boolean;
  onSelect?: () => void;
  className?: string;
  /** Con `asChild`: el elemento que recibe la fila, sin hijos propios. */
  children?: ReactElement;
}

export function SheetActionItem({
  icon: Icon,
  leading,
  label,
  description,
  trailing,
  destructive = false,
  disabled = false,
  asChild = false,
  onSelect,
  className,
  children,
}: SheetActionItemProps) {
  const rowClassName = cn(
    "pressable-row relative flex min-h-14 w-full items-center gap-3.5 px-4 py-2.5 text-left text-base outline-none focus-visible:-outline-offset-2",
    destructive ? "text-destructive" : "text-foreground",
    disabled && "pointer-events-none",
    className,
  );

  const leadingNode =
    leading ?? (Icon ? <Icon className={cn("size-5", destructive ? "text-destructive" : "text-muted-foreground")} aria-hidden="true" /> : null);

  const content = (
    <>
      {leadingNode ? <span className={cn("flex shrink-0 items-center", disabled && "opacity-50")}>{leadingNode}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("truncate font-medium", disabled && "opacity-50")}>{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </span>
      {trailing ? <span className={cn("flex shrink-0 items-center", disabled && "opacity-50")}>{trailing}</span> : null}
    </>
  );

  if (asChild) {
    return (
      <li>
        <Slot.Root
          data-slot="sheet-action-item"
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          className={rowClassName}
          onClick={(event) => {
            if (disabled) {
              event.preventDefault();
              return;
            }
            onSelect?.();
          }}
        >
          <Slot.Slottable>{children}</Slot.Slottable>
          {content}
        </Slot.Root>
      </li>
    );
  }

  return (
    <li>
      <button type="button" data-slot="sheet-action-item" disabled={disabled} onClick={onSelect} className={rowClassName}>
        {content}
      </button>
    </li>
  );
}
