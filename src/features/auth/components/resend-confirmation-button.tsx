"use client";

import { Loader2, MailPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resendConfirmationAction } from "../actions";

/** Supabase deja mandar un mail por cuenta cada 60 segundos. */
const COOLDOWN_S = 60;

/**
 * "Reenviar mail" de confirmación con cuenta regresiva entre envíos, para
 * no chocar con el límite de Supabase. `startCoolingDown`: recién se mandó uno.
 */
export function ResendConfirmationButton({
  email,
  next,
  startCoolingDown = false,
  variant = "secondary",
  className,
}: {
  email: string;
  next?: string;
  startCoolingDown?: boolean;
  variant?: "secondary" | "default";
  className?: string;
}) {
  const [remaining, setRemaining] = useState(startCoolingDown ? COOLDOWN_S : 0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  function resend() {
    if (isPending || remaining > 0) return;
    startTransition(async () => {
      const result = await resendConfirmationAction({ email, next });
      if (result.ok) {
        toast.success(result.message);
        setRemaining(COOLDOWN_S);
      } else {
        toast.error(result.message);
      }
    });
  }

  const waiting = remaining > 0;
  return (
    <Button
      type="button"
      size="lg"
      variant={variant}
      onClick={resend}
      disabled={isPending || waiting}
      aria-busy={isPending || undefined}
      className={cn("w-full", className)}
    >
      {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <MailPlus aria-hidden="true" />}
      {isPending ? "Enviando…" : waiting ? `Reenviar mail (${remaining} s)` : "Reenviar mail"}
    </Button>
  );
}
