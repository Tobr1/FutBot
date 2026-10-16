import { describe, expect, it } from "vitest";
import { routes, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/g/los-del-sabado-abc12")).toBe("/g/los-del-sabado-abc12");
    expect(safeNextPath("/invitacion/abc?x=1")).toBe("/invitacion/abc?x=1");
  });

  it.each(["https://malicioso.com", "//malicioso.com", "/\\malicioso.com", "javascript:alert(1)", "", null, undefined])(
    "rechaza %j y usa el destino por defecto",
    (value) => {
      expect(safeNextPath(value)).toBe(routes.dashboard);
    },
  );
});
