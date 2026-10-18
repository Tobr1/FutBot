import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Slot } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LinkPending } from "./link-pending";

/**
 * Lista agrupada estilo iOS/Android: panel redondeado con filas divididas.
 * Usar con <ListRow> como hijos directos.
 */
export function ListGroup({
  children,
  className,
  label,
  ordered = false,
}: {
  children: ReactNode;
  className?: string;
  /** Nombre accesible de la lista (aria-label). */
  label?: string;
  /** Renderiza un <ol> (rankings, tops). */
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={cn("list-group", className)} aria-label={label}>
      {children}
    </List>
  );
}

const ROW = "relative flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left";
const INTERACTIVE = "pressable-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

export interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /** Muestra el chevron › al final (drill-down). */
  chevron?: boolean;
  /** La fila entera es un <Link> (con indicador de navegación pendiente). */
  href?: string;
  transitionTypes?: string[];
  /**
   * La fila se fusiona con su único hijo (p. ej. un <button> de un componente
   * cliente o un submit). El hijo recibe las clases y el contenido de la fila.
   */
  asChild?: boolean;
  destructive?: boolean;
  className?: string;
  /** Con `asChild`: el elemento a usar como fila. Sin él: contenido extra bajo el subtítulo. */
  children?: ReactNode;
  /** Nombre accesible de la fila interactiva (link o asChild). */
  "aria-label"?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  chevron = false,
  href,
  transitionTypes,
  asChild = false,
  destructive = false,
  className,
  children,
  "aria-label": ariaLabel,
}: ListRowProps) {
  const content = (
    <>
      {leading && <span className="flex shrink-0 items-center gap-3">{leading}</span>}
      <span className="block min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-semibold", destructive && "text-destructive")}>{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>}
        {!asChild && children}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2">{trailing}</span>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );

  let row: ReactNode;
  if (href) {
    row = (
      <Link href={href} transitionTypes={transitionTypes} aria-label={ariaLabel} className={cn(ROW, INTERACTIVE, className)}>
        {content}
        <LinkPending />
      </Link>
    );
  } else if (asChild) {
    row = (
      <Slot.Root aria-label={ariaLabel} className={cn(ROW, INTERACTIVE, className)}>
        <Slot.Slottable>{children}</Slot.Slottable>
        {content}
      </Slot.Root>
    );
  } else {
    // Fila estática (sin feedback de toque: no hace nada al tocarla).
    row = <div className={cn(ROW, className)}>{content}</div>;
  }

  return <li>{row}</li>;
}
