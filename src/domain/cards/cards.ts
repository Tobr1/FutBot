/**
 * Cartas FulBot: seis atributos (1-99), media ponderada por posición, nivel
 * (bronce / plata / oro) y edición Élite por MVP acumulados. Puro.
 *
 * Los pesos y umbrales son una propuesta inicial (no un modelo validado):
 * viven acá para poder ajustarlos sin tocar la base.
 */

import type { Position } from "@/domain/players/positions";

export type AttributeKind = "field" | "goalkeeper";

export interface AttributeDef {
  code: string;
  label: string;
  /** Qué mide, para la ayuda del formulario. */
  hint: string;
}

export const ATTRIBUTES: Record<AttributeKind, readonly AttributeDef[]> = {
  field: [
    { code: "RIT", label: "Ritmo", hint: "Velocidad y aceleración" },
    { code: "TIR", label: "Tiro", hint: "Definición y potencia" },
    { code: "PAS", label: "Pase", hint: "Precisión y visión de juego" },
    { code: "REG", label: "Regate", hint: "Gambeta y control de pelota" },
    { code: "DEF", label: "Defensa", hint: "Marca, quite y anticipo" },
    { code: "FIS", label: "Físico", hint: "Fuerza y resistencia" },
  ],
  goalkeeper: [
    { code: "EST", label: "Estirada", hint: "Llegar a las pelotas lejanas" },
    { code: "MAN", label: "Manos", hint: "Atajar y retener sin dar rebote" },
    { code: "SAQ", label: "Saque", hint: "Saque con la mano y con el pie" },
    { code: "REF", label: "Reflejos", hint: "Reacción en los tiros de cerca" },
    { code: "VEL", label: "Velocidad", hint: "Salir rápido del arco" },
    { code: "POS", label: "Posicionamiento", hint: "Ubicarse bien y achicar" },
  ],
};

export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 99;

/** Validaciones de compañeros necesarias para que la carta deje de ser provisional. */
export const MIN_VALIDATORS = 3;

/** MVP acumulados para la edición Élite (solo cambia el diseño, no la media). */
export const ELITE_MVPS = 10;

/** Umbrales de media por nivel. */
export const TIER_MIN = { silver: 60, gold: 75 } as const;

export type CardTier = "bronze" | "silver" | "gold";

export const CARD_TIER_LABELS: Record<CardTier, string> = { bronze: "Bronce", silver: "Plata", gold: "Oro" };

/** Pesos por posición (suman 1), en el orden de ATTRIBUTES. */
const WEIGHTS: Record<"defender" | "midfielder" | "forward" | "goalkeeper", readonly number[]> = {
  //          RIT   TIR   PAS   REG   DEF   FIS
  defender: [0.1, 0.05, 0.15, 0.05, 0.35, 0.3],
  midfielder: [0.1, 0.1, 0.3, 0.2, 0.15, 0.15],
  forward: [0.15, 0.3, 0.15, 0.2, 0.05, 0.15],
  //          EST   MAN   SAQ   REF   VEL   POS
  goalkeeper: [0.2, 0.2, 0.1, 0.25, 0.05, 0.2],
};

/** Tipo de atributos según la posición principal (sin posición: de campo). */
export function attributeKindFor(position: Position | null): AttributeKind {
  return position === "goalkeeper" ? "goalkeeper" : "field";
}

/**
 * Media de la carta (1-99): promedio ponderado por posición. Un jugador de
 * campo sin posición usa el promedio simple.
 */
export function cardOverall(values: readonly number[], position: Position | null): number {
  if (values.length !== 6) return 0;
  const kind = attributeKindFor(position);
  const weights =
    kind === "goalkeeper" ? WEIGHTS.goalkeeper : position && position !== "goalkeeper" ? WEIGHTS[position] : null;
  const total = weights ? values.reduce((sum, v, i) => sum + v * weights[i], 0) : values.reduce((a, b) => a + b, 0) / 6;
  return clampAttribute(Math.round(total));
}

export function clampAttribute(n: number): number {
  if (!Number.isFinite(n)) return ATTRIBUTE_MIN;
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, Math.round(n)));
}

export function cardTier(overall: number): CardTier {
  if (overall >= TIER_MIN.gold) return "gold";
  if (overall >= TIER_MIN.silver) return "silver";
  return "bronze";
}

export function isElite(mvps: number): boolean {
  return mvps >= ELITE_MVPS;
}

export interface PublishedAttributes {
  kind: AttributeKind;
  /** Valores publicados con un decimal (como los devuelve la base). */
  values: number[];
  hasSelf: boolean;
  validators: number;
  updatedAt: string | null;
}

export interface CardModel {
  overall: number;
  tier: CardTier;
  elite: boolean;
  provisional: boolean;
  /** Valores redondeados para mostrar (null si todavía no hay atributos). */
  attributes: { kind: AttributeKind; values: number[] } | null;
  /** De dónde sale la media: los atributos o, mientras no haya, la forma de los partidos. */
  source: "attributes" | "form";
}

/**
 * Modelo de la carta. Con atributos, la media sale de ellos (provisional con
 * menos de 3 validaciones). Sin atributos, se usa la media de los partidos
 * (`formOverall`, 10-99) y la carta queda provisional.
 */
export function buildCard({
  attributes,
  position,
  mvps,
  formOverall,
}: {
  attributes: PublishedAttributes | null;
  position: Position | null;
  mvps: number;
  formOverall: number;
}): CardModel {
  const usable = attributes && attributes.kind === attributeKindFor(position) ? attributes : null;
  if (usable) {
    const overall = cardOverall(usable.values, position);
    return {
      overall,
      tier: cardTier(overall),
      elite: isElite(mvps),
      provisional: usable.validators < MIN_VALIDATORS,
      attributes: { kind: usable.kind, values: usable.values.map(clampAttribute) },
      source: "attributes",
    };
  }
  const overall = clampAttribute(formOverall);
  return { overall, tier: cardTier(overall), elite: isElite(mvps), provisional: true, attributes: null, source: "form" };
}
