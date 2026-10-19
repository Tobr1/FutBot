"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Control segmentado (pastilla con dos o tres opciones) sobre Radix Tabs:
 * flechas para moverse, tabpanels enlazados y foco visible. Cada opción
 * mide 44px en punteros gruesos.
 */
export function SegmentedTabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} className={cn("flex flex-col gap-4", props.className)} />;
}

export function SegmentedList({ className, label, children }: { className?: string; label: string; children: ReactNode }) {
  return (
    <TabsPrimitive.List
      aria-label={label}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-1 p-1 ring-1 ring-hairline", className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function SegmentedTrigger({
  value,
  children,
  count,
  className,
}: {
  value: string;
  children: ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "pressable inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground pointer-coarse:h-11",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "data-[state=active]:bg-surface-3 data-[state=active]:text-foreground data-[state=active]:shadow-elev-1",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {count !== undefined && <span className="text-xs font-medium text-muted-foreground tabular">{count}</span>}
    </TabsPrimitive.Trigger>
  );
}

export function SegmentedContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content {...props} className={cn("outline-none", className)} />;
}
