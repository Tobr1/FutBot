"use client";

import { useActionState, useRef, useState } from "react";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PlayerCard, type PlayerCardData } from "@/components/shared/player-card";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import type { DominantFoot, Position } from "@/domain/players/positions";
import { overall } from "@/domain/players/rating";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { savePlayerAction } from "../actions";
import { FootPicker, pickerAria, PositionPicker, usePositionsState } from "./pickers";
import { RatingInput } from "./rating-input";

export interface PlayerFormDefaults {
  id?: string;
  nickname: string;
  fullName: string;
  baseRating: number;
  primaryPosition: Position | "";
  secondaryPosition: Position | "";
  dominantFoot: DominantFoot | "";
}

const EMPTY: PlayerFormDefaults = {
  nickname: "",
  fullName: "",
  baseRating: 5,
  primaryPosition: "",
  secondaryPosition: "",
  dominantFoot: "",
};

/** Nombres de personas: sin autocorrector ni sugerencias del navegador. */
const PERSON_NAME_INPUT = {
  autoCapitalize: "words",
  autoCorrect: "off",
  spellCheck: false,
  autoComplete: "off",
} as const;

/** Alta/edición de ficha por un admin, con vista previa de la tarjeta. */
export function PlayerForm({
  groupId,
  defaults = EMPTY,
  autoFocusNickname = false,
}: {
  groupId: string;
  defaults?: PlayerFormDefaults;
  /** Solo al volver de "Y cargar otro": el foco queda listo en el apodo. */
  autoFocusNickname?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(savePlayerAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const isEdit = Boolean(defaults.id);

  const [nickname, setNickname] = useState(values?.nickname ?? defaults.nickname);
  const [rating, setRating] = useState(Number(values?.baseRating ?? defaults.baseRating));
  const { primary, secondary, setPrimary, setSecondary } = usePositionsState(
    (values?.primaryPosition as Position | "") ?? defaults.primaryPosition,
    (values?.secondaryPosition as Position | "") ?? defaults.secondaryPosition,
  );
  const [foot, setFoot] = useState<DominantFoot | "">((values?.dominantFoot as DominantFoot | "") ?? defaults.dominantFoot);

  const preview: PlayerCardData = {
    nickname: nickname.trim() || "Apodo",
    rating,
    primaryPosition: primary || null,
    isProvisional: true,
  };

  return (
    <form ref={formRef} action={action} className="grid gap-8 lg:grid-cols-[1fr_220px]" noValidate>
      <div className="grid gap-6">
        <input type="hidden" name="groupId" value={groupId} />
        {defaults.id && <input type="hidden" name="playerId" value={defaults.id} />}
        <FormMessage state={state} />

        <div className="grid grid-cols-[1fr_6.5rem] gap-4 lg:grid-cols-1">
          <div className="grid min-w-0 content-start gap-5 lg:grid-cols-2 lg:gap-6">
            <FormField id="nickname" label="Apodo" hint="Como aparece en las listas de WhatsApp." errors={errors?.nickname}>
              <Input
                {...fieldAria("nickname", errors?.nickname, true)}
                {...PERSON_NAME_INPUT}
                enterKeyHint="next"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej.: Juanchi"
                maxLength={30}
                autoFocus={autoFocusNickname}
                required
              />
            </FormField>
            <FormField id="fullName" label="Nombre completo (opcional)" errors={errors?.fullName}>
              <Input
                {...fieldAria("fullName", errors?.fullName)}
                {...PERSON_NAME_INPUT}
                enterKeyHint="done"
                defaultValue={values?.fullName ?? defaults.fullName}
                maxLength={80}
              />
            </FormField>
          </div>
          {/* Vista previa en vivo (mobile); en escritorio va en el aside */}
          <div aria-hidden="true" className="pt-6 lg:hidden">
            <PlayerCard player={preview} headingLevel="p" showFullName={false} className="w-[6.5rem]" />
          </div>
        </div>

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

        <FormField
          id="baseRating"
          control="group"
          label="Nivel inicial"
          hint="Es provisional: con partidos jugados la valoración se ajusta sola."
          errors={errors?.baseRating}
        >
          <RatingInput
            id="baseRating"
            name="baseRating"
            value={rating}
            onChange={setRating}
            describedBy={errors?.baseRating?.length ? "baseRating-error" : "baseRating-hint"}
            invalid={Boolean(errors?.baseRating?.length)}
          />
        </FormField>

        <StickyActionBar className={isEdit ? "grid" : "grid grid-cols-[1fr_auto] gap-2 lg:flex"}>
          <SubmitButton size="lg" name="intent" value="save" pendingText="Guardando…" className="w-full lg:w-auto">
            {isEdit ? "Guardar cambios" : "Crear jugador"}
          </SubmitButton>
          {!isEdit && (
            <SubmitButton size="lg" variant="secondary" name="intent" value="save-and-new">
              Y cargar otro
            </SubmitButton>
          )}
        </StickyActionBar>
      </div>

      <aside
        className="hidden lg:sticky lg:top-[calc(var(--chrome-top)+1rem)] lg:block lg:self-start"
        aria-label="Vista previa"
      >
        <p className="mb-2 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Vista previa</p>
        <PlayerCard player={preview} headingLevel="p" />
        <p className="mt-2 text-center text-xs text-muted-foreground">Valoración {overall(rating)}</p>
      </aside>
    </form>
  );
}
