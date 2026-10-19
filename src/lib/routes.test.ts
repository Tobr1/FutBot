import { describe, expect, it } from "vitest";
import { PROTECTED_PREFIXES, routes, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/g/los-del-sabado-abc12")).toBe("/g/los-del-sabado-abc12");
    expect(safeNextPath("/invitacion/abc?x=1")).toBe("/invitacion/abc?x=1");
  });

  it.each([
    "https://malicioso.com",
    "//malicioso.com",
    "/\\malicioso.com",
    "/\t/malicioso.com",
    "/\n/malicioso.com",
    "/\r\n/malicioso.com",
    "/g/x\\..\\..\\/malicioso.com",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ])(
    "rechaza %j y usa el destino por defecto",
    (value) => {
      expect(safeNextPath(value)).toBe(routes.dashboard);
    },
  );

  it("lo que acepta nunca sale del origen al resolverlo como URL", () => {
    const base = "https://futboleros.app";
    for (const value of ["/inicio", "/g/x?next=//y", "/a/%2F%2Fevil", "/\t/evil", "/ /evil", "/%09/evil"]) {
      expect(new URL(safeNextPath(value), base).origin).toBe(base);
    }
  });

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

describe("rutas de estadísticas", () => {
  it("arma votación, historial y comparación", () => {
    expect(routes.matchVote("x", "m1")).toBe("/g/x/partidos/m1/votar");
    expect(routes.groupHistory("x")).toBe("/g/x/historial");
    expect(routes.comparePlayers("x", "p1")).toBe("/g/x/jugadores/p1/comparar");
    expect(routes.comparePlayers("x", "p1", "p2")).toBe("/g/x/jugadores/p1/comparar?con=p2");
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

describe("rutas de premios, análisis e imágenes para compartir", () => {
  it("cuelgan del grupo, así el proxy exige sesión", () => {
    expect(routes.groupAwards("x")).toBe("/g/x/premios");
    expect(routes.groupAnalytics("x")).toBe("/g/x/analisis");
    expect(routes.matchShareImage("x", "m")).toBe("/g/x/partidos/m/imagen");
    expect(routes.playerShareImage("x", "p")).toBe("/g/x/jugadores/p/imagen");
    for (const path of [routes.matchShareImage("x", "m"), routes.playerShareImage("x", "p")]) {
      expect(PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))).toBe(true);
    }
  });
});
