"use client";

import { Loader2 } from "lucide-react";
import { type ReactNode, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { MutationResult } from "@/lib/mutation-result";

// En el teléfono los botones son grandes y de ancho completo (zona del pulgar).
const MOBILE_BUTTON = "max-sm:h-12 max-sm:w-full max-sm:rounded-xl max-sm:text-base";

/**
 * Confirmación para acciones destructivas. Mantiene el diálogo abierto
 * mientras corre la acción y muestra el resultado como toast.
 *
 * Con `trigger` funciona solo (no controlado). Sin `trigger`, controlarlo con
 * `open`/`onOpenChange` (p. ej. desde un menú o una fila de lista).
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive = true,
  onConfirm,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<MutationResult<unknown>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** Elemento con foco al abrir (modo controlado, sin trigger propio). */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        if (result.message) toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      {trigger && (
        <AlertDialogTrigger asChild ref={triggerRef}>
          {trigger}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
        }}
        onCloseAutoFocus={(event) => {
          const target = trigger ? triggerRef.current : returnFocusRef.current;
          if (target?.isConnected) {
            // Con trigger, Radix ya le devuelve el foco; sin trigger lo hacemos acá.
            if (!trigger) {
              event.preventDefault();
              target.focus();
            }
            return;
          }
          // El origen desapareció (p. ej. la fila se borró): el foco va al contenido.
          event.preventDefault();
          document.getElementById("main")?.focus({ preventScroll: true });
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className={MOBILE_BUTTON}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={confirm}
            disabled={isPending}
            aria-busy={isPending || undefined}
            className={MOBILE_BUTTON}
          >
            {isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
