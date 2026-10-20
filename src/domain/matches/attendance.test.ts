import { describe, expect, it } from "vitest";
import { canChangeAttendance, matchCallMessage, myAttendance, whatsappShareUrl } from "./attendance";

const NOW = Date.parse("2026-10-20T12:00:00Z");

describe("canChangeAttendance", () => {
  it("solo en partidos programados que todavía no empezaron", () => {
    expect(canChangeAttendance("scheduled", "2026-10-21T22:00:00Z", NOW)).toBe(true);
    expect(canChangeAttendance("scheduled", "2026-10-20T11:00:00Z", NOW)).toBe(false);
    expect(canChangeAttendance("in_progress", "2026-10-21T22:00:00Z", NOW)).toBe(false);
    expect(canChangeAttendance("cancelled", "2026-10-21T22:00:00Z", NOW)).toBe(false);
  });
});

describe("myAttendance", () => {
  const participants = [
    { id: "a", status: "confirmed" as const, sortOrder: 0 },
    { id: "r2", status: "reserve" as const, sortOrder: 5 },
    { id: "r1", status: "reserve" as const, sortOrder: 3 },
    { id: "x", status: "dropped" as const, sortOrder: 4 },
  ];

  it("ubica al jugador y numera a los suplentes por orden de llegada", () => {
    expect(myAttendance(participants, "a")).toEqual({ kind: "confirmed" });
    expect(myAttendance(participants, "r1")).toEqual({ kind: "reserve", position: 1 });
    expect(myAttendance(participants, "r2")).toEqual({ kind: "reserve", position: 2 });
    expect(myAttendance(participants, "x")).toEqual({ kind: "dropped" });
  });

  it("sin ficha o sin responder", () => {
    expect(myAttendance(participants, null)).toEqual({ kind: "none" });
    expect(myAttendance(participants, "nadie")).toEqual({ kind: "none" });
  });
});

describe("matchCallMessage", () => {
  const base = {
    groupName: "Los del Sábado",
    whenLabel: "Sáb 25/10 · 22:00",
    venue: "La Canchita",
    capacity: 10,
    url: "https://fulbot.app/g/x/partidos/1",
  };

  it("con lugares libres lista a los titulares y cuántos faltan", () => {
    const text = matchCallMessage({ ...base, confirmed: ["Brito", "Manu"], reserves: [] });
    expect(text).toBe(
      [
        "⚽ *Los del Sábado* · Sáb 25/10 · 22:00",
        "📍 La Canchita",
        "Somos 2 de 10: faltan 8.",
        "",
        "1. Brito",
        "2. Manu",
        "",
        "Confirmá si vas o no acá 👉 https://fulbot.app/g/x/partidos/1",
      ].join("\n"),
    );
  });

  it("completo, con suplentes y sin cancha", () => {
    const text = matchCallMessage({
      ...base,
      venue: null,
      capacity: 2,
      confirmed: ["Brito", "Manu"],
      reserves: ["Vece"],
    });
    expect(text).toContain("Completo (2/2). Si confirmás, quedás de suplente.");
    expect(text).toContain("Suplentes:\n1. Vece");
    expect(text).not.toContain("📍");
  });

  it("suma el link de invitación para quien todavía no está en el grupo", () => {
    const text = matchCallMessage({ ...base, confirmed: [], reserves: [], inviteUrl: "https://futbot.app/invitacion/abc" });
    expect(text.endsWith("¿Todavía no estás en el grupo? Sumate primero acá 👉 https://futbot.app/invitacion/abc")).toBe(true);
    expect(matchCallMessage({ ...base, confirmed: [], reserves: [] })).not.toContain("Sumate primero");
  });

  it("falta uno, en singular", () => {
    expect(matchCallMessage({ ...base, capacity: 3, confirmed: ["A", "B"], reserves: [] })).toContain("falta 1.");
  });
});

describe("whatsappShareUrl", () => {
  it("codifica el texto para wa.me", () => {
    expect(whatsappShareUrl("Hola *grupo*\n¿vas?")).toBe("https://wa.me/?text=Hola%20*grupo*%0A%C2%BFvas%3F");
  });
});
