"use client";

import { DOMINANT_FEET, type DominantFoot, FOOT_LABELS, POSITION_LABELS, POSITIONS, type Position } from "@/domain/players/positions";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T | "";
  label: string;
  sublabel?: string;
}

/** Grupo de opciones táctiles con un input oculto para el formulario. */
function ChoiceGroup<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  disabledValues = [],
  columns,
}: {
  name: string;
  label: string;
  options: Option<T>[];
  value: T | "";
  onChange: (value: T | "") => void;
  disabledValues?: Array<T | "">;
  columns: string;
}) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label={label} className={cn("grid gap-2", columns)}>
        {options.map((option) => {
          const selected = option.value === value;
          const disabled = disabledValues.includes(option.value);
          return (
            <button
              key={option.value || "none"}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl border px-2 transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35",
                selected
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-surface/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span className="font-display text-base leading-none font-bold tracking-wide uppercase">{option.label}</span>
              {option.sublabel && <span className="mt-0.5 text-[10px] leading-none">{option.sublabel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PositionPicker({
  name,
  label,
  value,
  onChange,
  exclude,
  allowNone = true,
}: {
  name: string;
  label: string;
  value: Position | "";
  onChange: (value: Position | "") => void;
  exclude?: Position | "";
  allowNone?: boolean;
}) {
  const options: Option<Position>[] = [
    ...POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p].short, sublabel: POSITION_LABELS[p].long })),
    ...(allowNone ? [{ value: "" as const, label: "—", sublabel: "Ninguna" }] : []),
  ];
  return (
    <ChoiceGroup
      name={name}
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      disabledValues={exclude ? [exclude] : []}
      columns={allowNone ? "grid-cols-5" : "grid-cols-4"}
    />
  );
}

export function FootPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: DominantFoot | "";
  onChange: (value: DominantFoot | "") => void;
}) {
  const options: Option<DominantFoot>[] = [
    ...DOMINANT_FEET.map((f) => ({ value: f, label: FOOT_LABELS[f] })),
    { value: "", label: "—", sublabel: "Sin dato" },
  ];
  return <ChoiceGroup name={name} label="Pierna hábil" options={options} value={value} onChange={onChange} columns="grid-cols-4" />;
}
