import { describe, expect, it } from "vitest";
import { activeNavKey, isNavItemActive, NAV_ITEMS } from "./group-nav";

const SLUG = "los-del-sabado-abc12";

describe("NAV_ITEMS", () => {
  it("arma las 5 secciones en orden con sus rutas", () => {
    const items = NAV_ITEMS(SLUG);
    expect(items.map((item) => item.label)).toEqual(["Inicio", "Partidos", "Plantel", "Rankings", "Más"]);
    expect(items.map((item) => item.href)).toEqual([
      `/g/${SLUG}`,
      `/g/${SLUG}/partidos`,
      `/g/${SLUG}/jugadores`,
      `/g/${SLUG}/rankings`,
      `/g/${SLUG}/ajustes`,
    ]);
  });
});

describe("activeNavKey", () => {
  it.each([
    [`/g/${SLUG}`, "inicio"],
    [`/g/${SLUG}/`, "inicio"],
    [`/g/${SLUG}/partidos`, "partidos"],
    [`/g/${SLUG}/jugadores`, "plantel"],
    [`/g/${SLUG}/jugadores/123`, "plantel"],
    [`/g/${SLUG}/jugadores/nuevo`, "plantel"],
    [`/g/${SLUG}/rankings`, "rankings"],
    [`/g/${SLUG}/ajustes`, "mas"],
    [`/g/${SLUG}/ajustes/general`, "mas"],
    [`/g/${SLUG}/ajustes/invitaciones`, "mas"],
    [`/g/${SLUG}/mi-ficha`, "mas"],
  ])("%s → %s", (pathname, key) => {
    expect(activeNavKey(pathname, SLUG)).toBe(key);
  });

  it("Inicio solo se activa en la ruta exacta", () => {
    const [inicio] = NAV_ITEMS(SLUG);
    expect(isNavItemActive(`/g/${SLUG}/jugadores`, inicio)).toBe(false);
  });

  it("no confunde prefijos parecidos ni otros grupos", () => {
    expect(activeNavKey(`/g/${SLUG}/jugadoresx`, SLUG)).toBeNull();
    expect(activeNavKey(`/g/${SLUG}/ajustesx`, SLUG)).toBeNull();
    expect(activeNavKey(`/g/otro-grupo/jugadores`, SLUG)).toBeNull();
    expect(activeNavKey("/inicio", SLUG)).toBeNull();
  });
});
