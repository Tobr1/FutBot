"use client";

import { useActionState, useState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import type { DominantFoot, Position } from "@/domain/players/positions";
import { idleState } from "@/lib/action-result";
import { updateOwnPlayerAction } from "../actions";
import { FootPicker, PositionPicker } from "./pickers";

/** Lo que un jugador puede editar de su propia ficha (sin apodo ni nivel). */
export function OwnPlayerForm({
  groupId,
  player,
}: {
  groupId: string;
  player: { id: string; fullName: string; primaryPosition: Position | ""; secondaryPosition: Position | ""; dominantFoot: DominantFoot | "" };
}) {
  const [state, action] = useActionState(updateOwnPlayerAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const [primary, setPrimary] = useState<Position | "">(player.primaryPosition);
  const [secondary, setSecondary] = useState<Position | "">(player.secondaryPosition);
  const [foot, setFoot] = useState<DominantFoot | "">(player.dominantFoot);

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="playerId" value={player.id} />
      <FormMessage state={state} />

      <FormField id="fullName" label="Nombre completo (opcional)" errors={errors?.fullName}>
        <Input {...fieldAria("fullName", errors?.fullName)} defaultValue={player.fullName} maxLength={80} />
      </FormField>
      <FormField id="primaryPosition" label="Posición principal" errors={errors?.primaryPosition}>
        <PositionPicker
          name="primaryPosition"
          label="Posición principal"
          value={primary}
          onChange={(value) => {
            setPrimary(value);
            if (value && value === secondary) setSecondary("");
          }}
        />
      </FormField>
      <FormField id="secondaryPosition" label="Posición secundaria" errors={errors?.secondaryPosition}>
        <PositionPicker name="secondaryPosition" label="Posición secundaria" value={secondary} onChange={setSecondary} exclude={primary} />
      </FormField>
      <FormField id="dominantFoot" label="Pierna hábil" errors={errors?.dominantFoot}>
        <FootPicker name="dominantFoot" value={foot} onChange={setFoot} />
      </FormField>
      <p className="text-xs text-muted-foreground">El apodo y el nivel los define un administrador del grupo.</p>
      <div>
        <SubmitButton size="lg" pendingText="Guardando…">
          Guardar
        </SubmitButton>
      </div>
    </form>
  );
}
