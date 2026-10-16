"use client";

import { useActionState, useState } from "react";
import { fieldAria, FormField } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { PlayerCard } from "@/components/shared/player-card";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import type { DominantFoot, Position } from "@/domain/players/positions";
import { baseRatingHint, overall } from "@/domain/players/rating";
import { idleState } from "@/lib/action-result";
import { savePlayerAction } from "../actions";
import { FootPicker, PositionPicker } from "./pickers";

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

/** Alta/edición de ficha por un admin, con vista previa de la tarjeta. */
export function PlayerForm({ groupId, defaults = EMPTY }: { groupId: string; defaults?: PlayerFormDefaults }) {
  const [state, action] = useActionState(savePlayerAction, idleState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const isEdit = Boolean(defaults.id);

  const [nickname, setNickname] = useState(values?.nickname ?? defaults.nickname);
  const [rating, setRating] = useState(Number(values?.baseRating ?? defaults.baseRating));
  const [primary, setPrimary] = useState<Position | "">((values?.primaryPosition as Position | "") ?? defaults.primaryPosition);
  const [secondary, setSecondary] = useState<Position | "">((values?.secondaryPosition as Position | "") ?? defaults.secondaryPosition);
  const [foot, setFoot] = useState<DominantFoot | "">((values?.dominantFoot as DominantFoot | "") ?? defaults.dominantFoot);

  function changePrimary(value: Position | "") {
    setPrimary(value);
    if (value && value === secondary) setSecondary("");
  }

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_220px]" noValidate>
      <div className="grid gap-6">
        <input type="hidden" name="groupId" value={groupId} />
        {defaults.id && <input type="hidden" name="playerId" value={defaults.id} />}
        <FormMessage state={state} />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="nickname" label="Apodo" hint="Como aparece en las listas de WhatsApp." errors={errors?.nickname}>
            <Input
              {...fieldAria("nickname", errors?.nickname, true)}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej.: Juanchi"
              maxLength={30}
              autoFocus={!isEdit}
              required
            />
          </FormField>
          <FormField id="fullName" label="Nombre completo (opcional)" errors={errors?.fullName}>
            <Input {...fieldAria("fullName", errors?.fullName)} defaultValue={values?.fullName ?? defaults.fullName} maxLength={80} />
          </FormField>
        </div>

        <FormField id="primaryPosition" label="Posición principal" errors={errors?.primaryPosition}>
          <PositionPicker name="primaryPosition" label="Posición principal" value={primary} onChange={changePrimary} />
        </FormField>

        <FormField id="secondaryPosition" label="Posición secundaria" errors={errors?.secondaryPosition}>
          <PositionPicker
            name="secondaryPosition"
            label="Posición secundaria"
            value={secondary}
            onChange={setSecondary}
            exclude={primary}
          />
        </FormField>

        <FormField id="dominantFoot" label="Pierna hábil (opcional)" errors={errors?.dominantFoot}>
          <FootPicker name="dominantFoot" value={foot} onChange={setFoot} />
        </FormField>

        <FormField
          id="baseRating"
          label={
            <span className="flex w-full items-baseline justify-between">
              Nivel inicial
              <span className="font-display text-2xl font-extrabold text-primary tabular">{rating.toFixed(1)}</span>
            </span>
          }
          hint={`${baseRatingHint(rating)} Es provisional: con partidos jugados la valoración se ajusta sola.`}
          errors={errors?.baseRating}
        >
          <input
            {...fieldAria("baseRating", errors?.baseRating, true)}
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="h-11 w-full cursor-pointer accent-primary"
          />
        </FormField>

        <div className="flex flex-wrap gap-2">
          <SubmitButton size="lg" name="intent" value="save" pendingText="Guardando…">
            {isEdit ? "Guardar cambios" : "Crear jugador"}
          </SubmitButton>
          {!isEdit && (
            <SubmitButton size="lg" variant="secondary" name="intent" value="save-and-new">
              Guardar y cargar otro
            </SubmitButton>
          )}
        </div>
      </div>

      <aside className="hidden lg:block" aria-label="Vista previa">
        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Vista previa</p>
        <PlayerCard
          player={{
            nickname: nickname.trim() || "Apodo",
            rating,
            primaryPosition: primary || null,
            isProvisional: true,
          }}
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">Valoración {overall(rating)}</p>
      </aside>
    </form>
  );
}
