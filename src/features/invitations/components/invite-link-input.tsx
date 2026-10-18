"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractInvitationToken } from "@/domain/invitations/extract-token";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Campo para pegar el link de invitación que llegó por WhatsApp y abrirlo. */
export function InviteLinkInput({ className }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = extractInvitationToken(value);
    if (!token) {
      setError(true);
      return;
    }
    setError(false);
    startTransition(() => {
      router.push(routes.invitation(token), { transitionTypes: ["nav-forward"] });
    });
  }

  const inputId = `${id}-invite`;
  const errorId = `${id}-invite-error`;

  return (
    <form onSubmit={onSubmit} noValidate className={cn("w-full max-w-sm text-left", className)}>
      <label htmlFor={inputId} className="sr-only">
        Link de invitación
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(false);
          }}
          placeholder="Pegá el link de invitación"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={error || undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <Button type="submit" variant="secondary" className="h-11 shrink-0" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? (
            <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
          Abrir
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-destructive">
          Ese link no parece una invitación
        </p>
      )}
    </form>
  );
}
