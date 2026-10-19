"use client";

import { useId, useState } from "react";
import { type ChoiceOption, ChoiceCards } from "@/components/shared/choice-cards";

const COMMON_FORMATS = [5, 6, 7, 8, 9, 11] as const;

const OPTIONS: ChoiceOption<string>[] = COMMON_FORMATS.map((n) => ({
  value: String(n),
  label: <span className="font-display text-xl leading-none font-extrabold">F{n}</span>,
  description: `${n}v${n}`,
}));

/**
 * Selector táctil del formato (jugadores por equipo): un radiogroup real con
 * foco itinerante. No controlado: envía el valor con el formulario (`name`).
 *
 * Dentro de un FormField control="group" se enlaza con su etiqueta, ayuda y
 * error con `{...groupAria(id, errors)}`. Sin etiqueta visible usa una solo
 * para lectores de pantalla.
 */
export function PlayersPerTeamPicker({
  name,
  defaultValue = 5,
  onValueChange,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  name: string;
  defaultValue?: number;
  /** Aviso opcional al cambiar (el valor igual viaja con el formulario). */
  onValueChange?: (value: number) => void;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [value, setValue] = useState<string>(String(defaultValue));
  const fallbackLabelId = useId();

  return (
    <>
      {!labelledBy && (
        <span id={fallbackLabelId} className="sr-only">
          Jugadores por equipo
        </span>
      )}
      <ChoiceCards
        name={name}
        value={value}
        // Siempre hay un formato elegido: no se permite quedar vacío.
        onChange={(next) => {
          if (!next) return;
          setValue(next);
          onValueChange?.(Number(next));
        }}
        options={OPTIONS}
        columns="grid-cols-3 sm:grid-cols-6"
        size="lg"
        ariaLabelledBy={labelledBy ?? fallbackLabelId}
        ariaDescribedBy={describedBy}
        invalid={invalid}
      />
    </>
  );
}
