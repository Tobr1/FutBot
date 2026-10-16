import { describe, expect, it } from "vitest";
import { formatIsoDate, todayIso } from "./format";

describe("format", () => {
  it("formatea fechas ISO sin corrimiento de zona horaria", () => {
    expect(formatIsoDate("2026-01-01")).toBe("1 de ene de 2026");
  });

  it("calcula el día local del grupo", () => {
    // 02:00 UTC del 17/10 todavía es 16/10 en Buenos Aires (UTC-3).
    expect(todayIso("America/Argentina/Buenos_Aires", new Date("2026-10-17T02:00:00Z"))).toBe("2026-10-16");
  });
});
