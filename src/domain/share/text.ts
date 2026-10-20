/**
 * Textos para compartir resultados y fichas (WhatsApp, hoja nativa) y
 * nombres de archivo de las imágenes. Puro.
 */

import { slugify } from "@/domain/names/normalize";

export interface ShareTeam {
  name: string;
  score: number;
}

export interface MatchShareInput {
  groupName: string;
  /** "Sáb 25/10". */
  dateLabel: string;
  teams: { a: ShareTeam; b: ShareTeam };
  scorers?: string[];
  mvp?: string | null;
}

/** "Los del Sábado · Sáb 25/10\nAzul 5–3 Rojo\nGoles: Brito 2, Manu\nMVP: Brito" */
export function matchShareMessage(input: MatchShareInput): string {
  const lines = [
    `${input.groupName} · ${input.dateLabel}`,
    `${input.teams.a.name} ${input.teams.a.score}–${input.teams.b.score} ${input.teams.b.name}`,
  ];
  if (input.scorers && input.scorers.length > 0) lines.push(`Goles: ${input.scorers.join(", ")}`);
  if (input.mvp) lines.push(`MVP: ${input.mvp}`);
  return lines.join("\n");
}

export interface PlayerShareInput {
  nickname: string;
  groupName: string;
  overall: number;
  tierLabel: string;
  matches: number;
  goals: number;
  mvps: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Brito en Los del Sábado: 78 · Figura · 24 PJ · 12 goles · 3 MVP" */
export function playerShareMessage(input: PlayerShareInput): string {
  const parts = [`${input.overall}`, input.tierLabel, `${input.matches} PJ`, plural(input.goals, "gol", "goles")];
  if (input.mvps > 0) parts.push(`${input.mvps} MVP`);
  return `${input.nickname} en ${input.groupName}: ${parts.join(" · ")}`;
}

/** "fulbot-partido-2026-10-25.png", "fulbot-brito.png". */
export function shareFileName(...parts: string[]): string {
  const slug = parts
    .map((p) => slugify(p) ?? "")
    .filter(Boolean)
    .join("-");
  return `fulbot${slug ? `-${slug}` : ""}.png`;
}

/** Link de WhatsApp con el texto y la URL. */
export function whatsappShareUrl(text: string, url?: string): string {
  return `https://wa.me/?text=${encodeURIComponent(url ? `${text}\n${url}` : text)}`;
}

/** "Brito ×2" para la lista de goleadores de la imagen. */
export function scorerLabel(name: string, count: number): string {
  return count > 1 ? `${name} ×${count}` : name;
}
