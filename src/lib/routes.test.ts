import { describe, expect, it } from "vitest";
import { PROTECTED_PREFIXES, routes, safeNextPath } from "./routes";

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

  it("acepta el destino de arranque de la PWA", () => {
    expect(safeNextPath(routes.launch)).toBe("/abrir");
  });
});

describe("routes", () => {
  it("expone el destino de arranque de la PWA", () => {
    expect(routes.launch).toBe("/abrir");
  });

  it("arma la ruta de los datos generales del grupo bajo Más", () => {
    expect(routes.groupGeneralSettings("los-del-sabado")).toBe("/g/los-del-sabado/ajustes/general");
    expect(routes.groupGeneralSettings("x").startsWith(routes.groupSettings("x"))).toBe(true);
  });
});

describe("PROTECTED_PREFIXES", () => {
  const isProtected = (pathname: string) =>
    PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

  it("protege /abrir (sin sesión, el proxy manda a ingresar y vuelve)", () => {
    expect(isProtected(routes.launch)).toBe(true);
  });

  it("protege las rutas de grupo y deja libres las públicas", () => {
    expect(isProtected(routes.groupGeneralSettings("abc"))).toBe(true);
    expect(isProtected(routes.home)).toBe(false);
    expect(isProtected(routes.login)).toBe(false);
    expect(isProtected(routes.invitation("token"))).toBe(false);
  });
});
