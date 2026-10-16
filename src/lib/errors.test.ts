import { describe, expect, it } from "vitest";
import { businessErrorKey, GENERIC_ERROR, toAuthMessage, toUserMessage } from "./errors";

describe("toUserMessage", () => {
  it("traduce claves de negocio lanzadas por las RPC", () => {
    expect(toUserMessage({ message: "last_admin", code: "P0001" })).toMatch(/al menos un administrador/);
    expect(businessErrorKey({ message: "invitation_expired" })).toBe("invitation_expired");
  });

  it("traduce violaciones de restricciones conocidas", () => {
    expect(
      toUserMessage({
        code: "23505",
        message: 'duplicate key value violates unique constraint "players_group_nickname_key"',
      }),
    ).toBe("Ya hay un jugador con ese apodo en el grupo.");
  });

  it("trata RLS y permisos como falta de permisos", () => {
    expect(toUserMessage({ code: "42501", message: 'new row violates row-level security policy for table "players"' })).toMatch(
      /permisos/,
    );
  });

  it("no filtra detalles técnicos desconocidos", () => {
    expect(toUserMessage({ message: "relation secret_table does not exist", code: "42P01" })).toBe(GENERIC_ERROR);
  });
});

describe("toAuthMessage", () => {
  it("traduce códigos de Supabase Auth", () => {
    expect(toAuthMessage({ code: "invalid_credentials" })).toBe("Email o contraseña incorrectos.");
    expect(toAuthMessage({ code: "algo_nuevo" })).toBe(GENERIC_ERROR);
  });
});
