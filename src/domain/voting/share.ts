/**
 * Mensaje para avisar en el grupo de WhatsApp que la votación de un partido
 * está abierta. Puro.
 */

export interface VotingShareInput {
  groupName: string;
  /** "Sáb 25/10". */
  dayLabel: string;
  /** "Azul 3–2 Rojo", si hay resultado. */
  scoreLine?: string | null;
  /** "1 día 3 h", lo que falta para el cierre. */
  timeLeft: string;
  /** Link a la pantalla de votar. */
  url: string;
}

export function votingShareMessage(input: VotingShareInput): string {
  const lines = [`🗳️ *${input.groupName}* · votación del partido del ${input.dayLabel}`];
  if (input.scoreLine) lines.push(input.scoreLine);
  lines.push(
    "",
    "Calificá a los que jugaron y elegí al jugador del partido. Es anónimo.",
    `Cierra en ${input.timeLeft} 👉 ${input.url}`,
  );
  return lines.join("\n");
}
