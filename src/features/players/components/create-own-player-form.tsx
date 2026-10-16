"use client";

import { useActionState, useState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import type { DominantFoot, Position } from "@/domain/players/positions";
import { idleState } from "@/lib/action-result";
import { createOwnPlayerAction } from "../actions";
import { FootPicker, PositionPicker } from "./pickers";

export function CreateOwnPlayerForm({ groupId, defaultNickname }: { groupId: string; defaultNickname: string }) {
  const [state, action] = useActionState(createOwnPlayerAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const [primary, setPrimary] = useState<Position | "">("");
  const [secondary, setSecondary] = useState<Position | "">("");
  const [foot, setFoot] = useState<DominantFoot | "">("");

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage state={state} />
      <FormField id="nickname" label="Tu apodo en el grupo" hint="Como te anotan en la lista de WhatsApp." errors={errors?.nickname}>
        <Input {...fieldAria("nickname", errors?.nickname, true)} defaultValue={values?.nickname ?? defaultNickname} maxLength={30} required />
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
      <FormField id="dominantFoot" label="Pierna hábil (opcional)" errors={errors?.dominantFoot}>
        <FootPicker name="dominantFoot" value={foot} onChange={setFoot} />
      </FormField>
      <div>
        <SubmitButton size="lg" pendingText="Creando ficha…">
          Crear mi ficha
        </SubmitButton>
      </div>
    </form>
  );
}
