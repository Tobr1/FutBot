"use client";

import { useActionState, useRef, useState } from "react";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import type { DominantFoot } from "@/domain/players/positions";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { createOwnPlayerAction } from "../actions";
import { FootPicker, pickerAria, PositionPicker, usePositionsState } from "./pickers";

/** Ficha nueva creada por el propio jugador (el nivel lo ajusta un admin). */
export function CreateOwnPlayerForm({ groupId, defaultNickname }: { groupId: string; defaultNickname: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createOwnPlayerAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const { primary, secondary, setPrimary, setSecondary } = usePositionsState("", "");
  const [foot, setFoot] = useState<DominantFoot | "">("");

  return (
    <form ref={formRef} action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage state={state} />
      <FormField id="nickname" label="Tu apodo en el grupo" hint="Como te anotan en la lista de WhatsApp." errors={errors?.nickname}>
        <Input
          {...fieldAria("nickname", errors?.nickname, true)}
          defaultValue={values?.nickname ?? defaultNickname}
          maxLength={30}
          required
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
      <FormField id="dominantFoot" control="group" label="Pierna hábil (opcional)" errors={errors?.dominantFoot}>
        <FootPicker name="dominantFoot" value={foot} onChange={setFoot} {...pickerAria("dominantFoot", errors?.dominantFoot)} />
      </FormField>
      <p className="text-xs text-muted-foreground">Tu nivel inicial lo ajusta un admin; después se calcula solo con los partidos.</p>

      {/* Vive dentro del panel desplegable de "Mi ficha": mismo fondo y esquinas que el panel. */}
      <StickyActionBar className="rounded-b-xl bg-surface-1/92">
        <SubmitButton size="lg" pendingText="Creando ficha…" className="w-full lg:w-auto">
          Crear mi ficha
        </SubmitButton>
      </StickyActionBar>
    </form>
  );
}
