import { describe, expect, it } from "vitest";
import { countSelection, dedupeSelection, orderForSave, type Selection, setSelectionStatus, toggleSelection } from "./participants";
import {
  allowedStatusChanges,
  canDeleteMatch,
  canEditParticipants,
  canEditTeams,
  canRecordResult,
  countParticipants,
  formatLabel,
  isOpenMatch,
  needsResult,
  squadSize,
} from "./status";

describe("convocatoria", () => {
  it("agrega como titular hasta completar los equipos y después como suplente", () => {
    let list: Selection[] = [];
    list = toggleSelection(list, "a", 2);
    list = toggleSelection(list, "b", 2);
    list = toggleSelection(list, "c", 2);
    expect(list).toEqual([
      { playerId: "a", status: "confirmed" },
      { playerId: "b", status: "confirmed" },
      { playerId: "c", status: "reserve" },
    ]);
    expect(countSelection(list)).toEqual({ confirmed: 2, reserve: 1 });
  });

  it("tocar de nuevo saca al jugador", () => {
    const list = toggleSelection([{ playerId: "a", status: "confirmed" }], "a", 10);
    expect(list).toEqual([]);
  });

  it("cambia titular por suplente sin mover el orden", () => {
    const list = setSelectionStatus(
      [
        { playerId: "a", status: "confirmed" },
        { playerId: "b", status: "confirmed" },
      ],
      "a",
      "reserve",
    );
    expect(list.map((s) => s.playerId)).toEqual(["a", "b"]);
    expect(list[0].status).toBe("reserve");
  });

  it("guarda titulares primero", () => {
    const ordered = orderForSave([
      { playerId: "r1", status: "reserve" },
      { playerId: "c1", status: "confirmed" },
      { playerId: "c2", status: "confirmed" },
    ]);
    expect(ordered.map((s) => s.playerId)).toEqual(["c1", "c2", "r1"]);
  });

  it("quita repetidos", () => {
    expect(
      dedupeSelection([
        { playerId: "a", status: "confirmed" },
        { playerId: "a", status: "reserve" },
      ]),
    ).toEqual([{ playerId: "a", status: "confirmed" }]);
  });
});

describe("estados del partido", () => {
  it("separa abiertos de cerrados", () => {
    expect(isOpenMatch("scheduled")).toBe(true);
    expect(isOpenMatch("in_progress")).toBe(true);
    expect(isOpenMatch("finished")).toBe(false);
    expect(isOpenMatch("cancelled")).toBe(false);
  });

  it("marca la falta de resultado solo si ya pasó la hora", () => {
    const at = "2026-10-19T22:00:00Z";
    expect(needsResult("scheduled", at, Date.parse("2026-10-19T21:00:00Z"))).toBe(false);
    expect(needsResult("scheduled", at, Date.parse("2026-10-19T23:00:00Z"))).toBe(true);
    expect(needsResult("finished", at, Date.parse("2026-10-19T23:00:00Z"))).toBe(false);
  });

  it("espeja los permisos de la base", () => {
    expect(canEditParticipants("finished")).toBe(false);
    expect(canEditParticipants("cancelled")).toBe(false);
    expect(canEditTeams("finished")).toBe(true);
    expect(canEditTeams("cancelled")).toBe(false);
    expect(canRecordResult("scheduled", false)).toBe(false);
    expect(canRecordResult("in_progress", true)).toBe(true);
    expect(canRecordResult("cancelled", true)).toBe(false);
    expect(canDeleteMatch("finished")).toBe(false);
    expect(canDeleteMatch("cancelled")).toBe(true);
  });

  it("no permite finalizar ni reabrir un jugado a mano", () => {
    expect(allowedStatusChanges("scheduled")).toEqual(["in_progress", "cancelled"]);
    expect(allowedStatusChanges("in_progress")).toEqual(["scheduled", "cancelled"]);
    expect(allowedStatusChanges("cancelled")).toEqual(["scheduled"]);
    expect(allowedStatusChanges("finished")).toEqual([]);
  });

  it("cuenta convocados y formato", () => {
    expect(squadSize(5)).toBe(10);
    expect(formatLabel(7)).toBe("F7");
    expect(countParticipants([{ status: "confirmed" }, { status: "reserve" }, { status: "dropped" }])).toEqual({
      confirmed: 1,
      reserve: 1,
    });
  });
});
