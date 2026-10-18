import { describe, expect, it } from "vitest";
import { extractInvitationToken, TOKEN_PATTERN } from "./extract-token";

const TOKEN = "0123456789abcdef".repeat(4);

describe("extractInvitationToken", () => {
  it("toma el token de un link completo", () => {
    expect(extractInvitationToken(`https://futboleros.app/invitacion/${TOKEN}`)).toBe(TOKEN);
  });

  it("tolera espacios y texto alrededor del link", () => {
    expect(extractInvitationToken(`  Sumate al grupo! https://futboleros.app/invitacion/${TOKEN} \n`)).toBe(TOKEN);
    expect(extractInvitationToken(`Link: https://futboleros.app/invitacion/${TOKEN}?ref=wa. Nos vemos`)).toBe(TOKEN);
  });

  it("acepta el token solo", () => {
    expect(extractInvitationToken(TOKEN)).toBe(TOKEN);
    expect(extractInvitationToken(`  ${TOKEN}  `)).toBe(TOKEN);
  });

  it("normaliza mayúsculas", () => {
    expect(extractInvitationToken(`https://futboleros.app/invitacion/${TOKEN.toUpperCase()}`)).toBe(TOKEN);
  });

  it("el resultado cumple TOKEN_PATTERN", () => {
    expect(TOKEN_PATTERN.test(extractInvitationToken(TOKEN) ?? "")).toBe(true);
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["texto sin token", "hola, ¿me pasás el link?"],
    ["token corto", TOKEN.slice(0, 63)],
    ["tira hex demasiado larga", `${TOKEN}a`],
    ["caracteres no hex", `${TOKEN.slice(0, 63)}g`],
    ["link sin token", "https://futboleros.app/invitacion/"],
  ])("devuelve null: %s", (_label, value) => {
    expect(extractInvitationToken(value)).toBeNull();
  });
});
