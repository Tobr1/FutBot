"use client";

import { ChevronDown, Link2, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChoiceCards } from "@/components/shared/choice-cards";
import { fieldAria, FormField, groupAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvitationAction } from "../actions";
import { createInvitationSchema, EXPIRY_OPTIONS } from "../schemas";
import { ShareInvite } from "./share-invite";

type Expiry = (typeof EXPIRY_OPTIONS)[number]["value"];

const EXPIRY_CHOICES = EXPIRY_OPTIONS.map((o) => ({ value: o.value as Expiry, label: o.label }));

/**
 * Genera un link de invitación general (sin ficha puntual). Siempre entra
 * como jugador (el único admin es el de la app). Por defecto 7 días y sin
 * límite de usos; lo demás va en "Opciones avanzadas".
 */
export function CreateInvitation({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [expiresIn, setExpiresIn] = useState<Expiry>("7");
  const [maxUses, setMaxUses] = useState("");
  const [maxUsesError, setMaxUsesError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const maxUsesRef = useRef<HTMLInputElement>(null);

  function showMaxUsesError(message: string) {
    setMaxUsesError(message);
    toast.error(message);
    if (advancedRef.current) advancedRef.current.open = true;
    requestAnimationFrame(() => maxUsesRef.current?.focus());
  }

  function create() {
    const input = { groupId, expiresIn, maxUses };
    // Misma validación que el servidor, para marcar el campo antes de enviar.
    const parsed = createInvitationSchema.safeParse(input);
    const maxUsesIssue = parsed.success ? undefined : parsed.error.issues.find((issue) => issue.path[0] === "maxUses");
    if (maxUsesIssue) {
      showMaxUsesError(maxUsesIssue.message);
      return;
    }
    setMaxUsesError(null);

    startTransition(async () => {
      const result = await createInvitationAction(input);
      if (result.ok && result.data) {
        setUrl(result.data.url);
        toast.success(result.message);
      } else if (!result.ok) {
        toast.error(result.message);
      }
    });
  }

  if (url) {
    return (
      <div className="grid gap-3">
        <ShareInvite url={url} message={`Sumate a "${groupName}" en FutBot:`} />
        <Button type="button" variant="ghost" onClick={() => setUrl(null)} className="justify-self-center">
          Crear otro link
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        create();
      }}
    >
      <details ref={advancedRef} className="group/advanced">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted-foreground select-none [&::-webkit-details-marker]:hidden">
          Opciones avanzadas
          <ChevronDown className="size-4 transition-transform group-open/advanced:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-5 pt-2 pb-2">
          <FormField id="invite-expiry" label="Vence en" control="group">
            <ChoiceCards
              name="expiresIn"
              value={expiresIn}
              onChange={(next) => next && setExpiresIn(next)}
              options={EXPIRY_CHOICES}
              columns="grid-cols-4"
              {...groupAria("invite-expiry")}
            />
          </FormField>
          <FormField
            id="invite-max"
            label="Usos máximos (opcional)"
            hint="Vacío = sin límite. Ideal para pegar en el grupo de WhatsApp."
            errors={maxUsesError ? [maxUsesError] : undefined}
          >
            <Input
              ref={maxUsesRef}
              {...fieldAria("invite-max", maxUsesError ? [maxUsesError] : undefined, true)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              maxLength={3}
              value={maxUses}
              onChange={(e) => {
                setMaxUses(e.target.value.replace(/\D/g, ""));
                if (maxUsesError) setMaxUsesError(null);
              }}
              placeholder="Sin límite"
              className="max-w-40"
            />
          </FormField>
        </div>
      </details>

      <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending || undefined} className="w-full">
        {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        Generar link del grupo
      </Button>
    </form>
  );
}
