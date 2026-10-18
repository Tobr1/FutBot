"use client";

import { useActionState, useRef, useState } from "react";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import type { DominantFoot, Position } from "@/domain/players/positions";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { updateOwnPlayerAction } from "../actions";
import { FootPicker, pickerAria, PositionPicker, usePositionsState } from "./pickers";

/** Lo que un jugador puede editar de su propia ficha (sin apodo ni nivel). */
export function OwnPlayerForm({
  groupId,
  player,
}: {
  groupId: string;
  player: { id: string; fullName: string; primaryPosition: Position | ""; secondaryPosition: Position | ""; dominantFoot: DominantFoot | "" };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(updateOwnPlayerAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const { primary, secondary, setPrimary, setSecondary } = usePositionsState(player.primaryPosition, player.secondaryPosition);
  const [foot, setFoot] = useState<DominantFoot | "">(player.dominantFoot);

  return (
    <form ref={formRef} action={action} className="grid max-w-2xl gap-6" noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="playerId" value={player.id} />
      <FormMessage state={state} />

      <FormField id="fullName" label="Nombre completo (opcional)" errors={errors?.fullName}>
        <Input
          {...fieldAria("fullName", errors?.fullName)}
          defaultValue={player.fullName}
          maxLength={80}
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="done"
        />
      </FormField>
      <FormField id="primaryPosition" control="group" label="Posición principal" errors={errors?.primaryPosition}>
        <PositionPicker
          name="primaryPosition"
          label="Posición principal"
          value={primary}
          onChange={setPrimary}
          {...pickerAria("primaryPosition", errors?.primaryPosition)}
        />
      </FormField>
      <FormField id="secondaryPosition" control="group" label="Posición secundaria" errors={errors?.secondaryPosition}>
        <PositionPicker
          name="secondaryPosition"
          label="Posición secundaria"
          value={secondary}
          onChange={setSecondary}
          exclude={primary}
          {...pickerAria("secondaryPosition", errors?.secondaryPosition)}
        />
      </FormField>
      <FormField id="dominantFoot" control="group" label="Pierna hábil" errors={errors?.dominantFoot}>
        <FootPicker name="dominantFoot" value={foot} onChange={setFoot} {...pickerAria("dominantFoot", errors?.dominantFoot)} />
      </FormField>
      <p className="text-xs text-muted-foreground">El apodo y el nivel los define un admin del grupo.</p>

      <StickyActionBar>
        <SubmitButton size="lg" pendingText="Guardando…" className="w-full lg:w-auto">
          Guardar cambios
        </SubmitButton>
      </StickyActionBar>
    </form>
  );
}
