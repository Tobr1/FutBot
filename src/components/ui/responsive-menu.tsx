"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactElement, type ReactNode, useCallback, useRef, useState } from "react";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTrigger,
  SheetActionGroup,
  SheetActionItem,
} from "@/components/ui/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export interface MenuItemDef {
  key: string;
  label: ReactNode;
  icon?: LucideIcon;
  /** Reemplaza al ícono (escudo, avatar…). */
  leading?: ReactNode;
  /** Siempre visible, también si el ítem está deshabilitado (explica el motivo). */
  description?: ReactNode;
  trailing?: ReactNode;
  /** Ítem de navegación: solo navega (y cierra el menú). */
  href?: string;
  transitionTypes?: string[];
  /** Acción: corre recién cuando el menú terminó de cerrarse. */
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MenuSectionDef {
  label?: ReactNode;
  items: MenuItemDef[];
}

export interface ResponsiveMenuProps {
  /** Elemento disparador (se usa con asChild): un <button> o un <Button>. */
  trigger: ReactElement;
  /** Título de la hoja en mobile y nombre accesible del menú en escritorio. */
  title: string;
  description?: ReactNode;
  /** Bloque superior (p. ej. avatar, nombre y email). En mobile reemplaza al título visible. */
  header?: ReactNode;
  sections: MenuSectionDef[];
  align?: "start" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Menú contextual que en escritorio (≥ 64rem) es un DropdownMenu y en mobile
 * una hoja inferior. Las acciones (`onSelect`) corren después de que el menú
 * se cerró del todo (en onCloseAutoFocus), así pueden abrir un ConfirmDialog
 * sin dejar `pointer-events: none` trabado en el body.
 */
export function ResponsiveMenu({
  trigger,
  title,
  description,
  header,
  sections,
  align = "end",
  open: openProp,
  onOpenChange,
}: ResponsiveMenuProps) {
  const isDesktop = useIsDesktop();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const pendingRef = useRef<(() => void) | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const selectAction = (item: MenuItemDef) => {
    pendingRef.current = item.onSelect ?? null;
    setOpen(false);
  };

  const handleCloseAutoFocus = (event: Event) => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    event.preventDefault();
    // El foco vuelve al disparador antes de la acción: si abre un diálogo,
    // Radix lo devuelve ahí al cerrarlo.
    triggerRef.current?.focus({ preventScroll: true });
    pending();
  };

  const visibleSections = sections.filter((section) => section.items.length > 0);

  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild ref={triggerRef}>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} aria-label={title} onCloseAutoFocus={handleCloseAutoFocus} className="w-72 max-w-[calc(100vw-2rem)]">
          {header ? (
            <>
              <div className="px-2.5 py-2">{header}</div>
              <DropdownMenuSeparator />
            </>
          ) : (
            <DropdownMenuLabel className="truncate">{title}</DropdownMenuLabel>
          )}
          {visibleSections.map((section, index) => (
            <Fragment key={index}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                {section.label ? <DropdownMenuLabel>{section.label}</DropdownMenuLabel> : null}
                {section.items.map((item) => (
                  <DropdownItem key={item.key} item={item} onAction={selectAction} />
                ))}
              </DropdownMenuGroup>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild ref={triggerRef}>
        {trigger}
      </BottomSheetTrigger>
      <BottomSheetContent
        title={title}
        description={description}
        header={header}
        hideHeader={Boolean(header)}
        showCancel
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <div className="space-y-4">
          {visibleSections.map((section, index) => (
            <SheetActionGroup key={index} label={section.label}>
              {section.items.map((item) =>
                item.href && !item.disabled ? (
                  <SheetActionItem
                    key={item.key}
                    asChild
                    icon={item.icon}
                    leading={item.leading}
                    label={item.label}
                    description={item.description}
                    trailing={item.trailing}
                    destructive={item.destructive}
                    onSelect={() => setOpen(false)}
                  >
                    <Link href={item.href} transitionTypes={item.transitionTypes} />
                  </SheetActionItem>
                ) : (
                  <SheetActionItem
                    key={item.key}
                    icon={item.icon}
                    leading={item.leading}
                    label={item.label}
                    description={item.description}
                    trailing={item.trailing}
                    destructive={item.destructive}
                    disabled={item.disabled}
                    onSelect={() => selectAction(item)}
                  />
                ),
              )}
            </SheetActionGroup>
          ))}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function DropdownItem({ item, onAction }: { item: MenuItemDef; onAction: (item: MenuItemDef) => void }) {
  const Icon = item.icon;
  const leading = item.leading ?? (Icon ? <Icon aria-hidden="true" /> : null);
  // Deshabilitado se atenúan ícono y texto, no la descripción que explica el motivo.
  const dim = item.disabled ? "opacity-50" : undefined;
  const content = (
    <>
      {leading ? <span className={cn("flex shrink-0 items-center", dim)}>{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate", dim)}>{item.label}</span>
        {item.description ? <span className="text-xs text-muted-foreground">{item.description}</span> : null}
      </span>
      {item.trailing ? <span className={cn("flex shrink-0 items-center", dim)}>{item.trailing}</span> : null}
    </>
  );
  const variant = item.destructive ? "destructive" : "default";

  if (item.href && !item.disabled) {
    return (
      <DropdownMenuItem asChild variant={variant}>
        <Link href={item.href} transitionTypes={item.transitionTypes}>
          {content}
        </Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      variant={variant}
      disabled={item.disabled}
      onSelect={() => onAction(item)}
      className={item.disabled ? "data-disabled:opacity-100" : undefined}
    >
      {content}
    </DropdownMenuItem>
  );
}
