"use client";

import { useId, useState } from "react";
import { type ChoiceOption, ChoiceCards } from "@/components/shared/choice-cards";
import { groupAria } from "@/components/shared/form-field";
import { POSITION_COLOR_VAR } from "@/components/shared/position-badge";
import { DOMINANT_FEET, type DominantFoot, FOOT_LABELS, POSITION_LABELS, POSITIONS, type Position } from "@/domain/players/positions";

/** Enlace con un FormField control="group" (labelledBy = "{id}-label"). */
interface GroupWiring {
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
}

/**
 * Props para un picker dentro de un FormField control="group" (mismos ids
 * que groupAria): `<PositionPicker {...pickerAria("primaryPosition", errors)} />`.
 */
export function pickerAria(id: string, errors?: string[], hint?: boolean): GroupWiring {
  const aria = groupAria(id, errors, hint);
  return {
    labelledBy: aria["aria-labelledby"],
    describedBy: aria["aria-describedby"],
    invalid: aria["aria-invalid"],
  };
}

/** Principal + secundaria: elegir como principal la secundaria la deja vacía. */
export function usePositionsState(initialPrimary: Position | "", initialSecondary: Position | "") {
  const [primary, setPrimaryState] = useState<Position | "">(initialPrimary);
  const [secondary, setSecondary] = useState<Position | "">(initialSecondary);
  function setPrimary(next: Position | "") {
    setPrimaryState(next);
    if (next && next === secondary) setSecondary("");
  }
  return { primary, secondary, setPrimary, setSecondary };
}

/**
 * Sin `labelledBy` el grupo necesita un nombre igual: se usa una etiqueta
 * solo para lectores de pantalla.
 */
function useGroupLabel(label: string, labelledBy?: string) {
  const fallbackId = useId();
  return {
    labelId: labelledBy ?? fallbackId,
    fallback: labelledBy ? null : (
      <span id={fallbackId} className="sr-only">
        {label}
      </span>
    ),
  };
}

/**
 * Posición en 4 tarjetas con la sigla (ARQ/DEF/MED/DEL); el nombre largo se
 * ve desde sm. La posición excluida (la principal, al elegir la secundaria)
 * queda deshabilitada con el motivo visible. Sin selección se envía "".
 */
export function PositionPicker({
  name,
  label,
  value,
  onChange,
  exclude,
  allowNone = true,
  labelledBy,
  describedBy,
  invalid,
}: {
  name: string;
  label: string;
  value: Position | "";
  onChange: (value: Position | "") => void;
  exclude?: Position | "";
  allowNone?: boolean;
} & GroupWiring) {
  const { labelId, fallback } = useGroupLabel(label, labelledBy);
  const options: ChoiceOption<Position>[] = POSITIONS.map((p) => ({
    value: p,
    label: (
      <span className="font-display text-lg leading-none font-bold tracking-wide">
        <span aria-hidden="true">{POSITION_LABELS[p].short}</span>
        <span className="sr-only">{POSITION_LABELS[p].long}</span>
      </span>
    ),
    description: <span aria-hidden="true">{POSITION_LABELS[p].long}</span>,
    descriptionClassName: "hidden sm:block text-2xs",
    accent: POSITION_COLOR_VAR[p],
    disabled: exclude === p,
    disabledReason: exclude === p ? "Es la principal" : undefined,
  }));

  return (
    <>
      {fallback}
      <ChoiceCards
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        columns="grid-cols-4"
        size="lg"
        clearLabel={allowNone ? "Sin posición" : undefined}
        ariaLabelledBy={labelId}
        ariaDescribedBy={describedBy}
        invalid={invalid}
      />
    </>
  );
}

/** Pierna hábil: Derecha / Izquierda / Ambas. Sin selección se envía "". */
export function FootPicker({
  name,
  value,
  onChange,
  labelledBy,
  describedBy,
  invalid,
}: {
  name: string;
  value: DominantFoot | "";
  onChange: (value: DominantFoot | "") => void;
} & GroupWiring) {
  const { labelId, fallback } = useGroupLabel("Pierna hábil", labelledBy);
  const options: ChoiceOption<DominantFoot>[] = DOMINANT_FEET.map((f) => ({
    value: f,
    label: <span className="text-sm font-semibold">{FOOT_LABELS[f]}</span>,
  }));

  return (
    <>
      {fallback}
      <ChoiceCards
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        columns="grid-cols-3"
        clearLabel="Sin dato"
        ariaLabelledBy={labelId}
        ariaDescribedBy={describedBy}
        invalid={invalid}
      />
    </>
  );
}
