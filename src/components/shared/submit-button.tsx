"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Botón de envío que se deshabilita mientras la Server Action corre: así
 * Enter o un doble toque no disparan un segundo envío. El foco tras un error
 * lo maneja useFormErrorFocus.
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
