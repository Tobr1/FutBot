"use client";

import { Link2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createInvitationAction } from "../actions";
import { EXPIRY_OPTIONS } from "../schemas";
import { ShareInvite } from "./share-invite";

type Expiry = (typeof EXPIRY_OPTIONS)[number]["value"];

/** Genera un link de invitación general (sin ficha puntual). */
export function CreateInvitation({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [role, setRole] = useState<"player" | "admin">("player");
  const [expiresIn, setExpiresIn] = useState<Expiry>("7");
  const [maxUses, setMaxUses] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createInvitationAction({ groupId, role, expiresIn, maxUses });
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
      <div className="grid gap-4">
        <ShareInvite url={url} message={`Sumate a "${groupName}" en FUTBOLEROS:`} />
        <Button variant="ghost" onClick={() => setUrl(null)} className="justify-self-start">
          Crear otra invitación
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <FormField id="invite-role" label="Rol">
        <Segmented
          label="Rol"
          value={role}
          onChange={setRole}
          options={[
            { value: "player", label: "Jugador" },
            { value: "admin", label: "Administrador" },
          ]}
        />
      </FormField>
      <FormField id="invite-expiry" label="Vence en">
        <Segmented
          label="Vencimiento"
          value={expiresIn}
          onChange={setExpiresIn}
          options={EXPIRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </FormField>
      <FormField id="invite-max" label="Usos máximos (opcional)" hint="Vacío = sin límite. Ideal para pegar en el grupo de WhatsApp.">
        <Input
          id="invite-max"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Sin límite"
          className="max-w-40"
        />
      </FormField>
      <div>
        <Button onClick={create} disabled={isPending} size="lg">
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          Generar link
        </Button>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
              selected ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
