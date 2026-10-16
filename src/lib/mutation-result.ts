/** Resultado de Server Actions invocadas imperativamente (botones, diálogos). */
export type MutationResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; message: string };

export const ok = <T = undefined>(message?: string, data?: T): MutationResult<T> => ({ ok: true, message, data });
export const fail = (message: string): MutationResult<never> => ({ ok: false, message });
