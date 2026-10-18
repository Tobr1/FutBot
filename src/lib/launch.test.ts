import { describe, expect, it } from "vitest";
import { SLUG_PATTERN } from "@/features/groups/schemas";
import {
  extractGroupSlug,
  isDocumentNavigation,
  isPrefetchRequest,
  LAST_GROUP_COOKIE,
  LAST_GROUP_COOKIE_OPTIONS,
  lastGroupToRemember,
  resolveLaunchTarget,
} from "./launch";
import { routes } from "./routes";

const headers = (entries: Record<string, string> = {}) => new Headers(entries);

/** Carga completa de página desde la barra de direcciones, un link o la PWA. */
const DOCUMENT = { "sec-fetch-dest": "document", "sec-fetch-mode": "navigate", accept: "text/html,application/xhtml+xml" };
/** fetch() del router (navegación RSC o prefetch): en el proxy ya no trae los headers internos. */
const ROUTER_FETCH = { "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", accept: "*/*" };

describe("extractGroupSlug", () => {
  it.each([
    ["/g/los-del-sabado-abc12", "los-del-sabado-abc12"],
    ["/g/los-del-sabado-abc12/", "los-del-sabado-abc12"],
    ["/g/abc/jugadores", "abc"],
    ["/g/abc/jugadores/123/editar", "abc"],
    ["/g/abc/ajustes/general", "abc"],
    ["/g/a1", "a1"],
  ])("extrae el slug de %s", (pathname, slug) => {
    expect(extractGroupSlug(pathname)).toBe(slug);
  });

  it.each([
    "/",
    "/g",
    "/g/",
    "/inicio",
    "/grupos/nuevo",
    "/gx/abc",
    "/x/g/abc",
    "/g/Los-Del-Sabado",
    "/g/-abc",
    "/g/abc-",
    "/g/a--b",
    "/g/abc_def",
    "/g/abc.def",
    "/g/abc%20def",
    "/g/ñandu",
  ])("devuelve null para %s", (pathname) => {
    expect(extractGroupSlug(pathname)).toBeNull();
  });

  it("descarta slugs de más de 80 caracteres", () => {
    expect(extractGroupSlug(`/g/${"a".repeat(80)}`)).toBe("a".repeat(80));
    expect(extractGroupSlug(`/g/${"a".repeat(81)}`)).toBeNull();
    expect(extractGroupSlug(`/g/${"a".repeat(81)}/jugadores`)).toBeNull();
  });

  it("coincide con el formato de slug de create_group", () => {
    for (const slug of ["los-del-sabado-abc12", "abc", "a1-b2-c3"]) {
      expect(SLUG_PATTERN.test(slug)).toBe(true);
      expect(extractGroupSlug(`/g/${slug}`)).toBe(slug);
    }
  });
});

describe("resolveLaunchTarget", () => {
  it("lleva al grupo cuando el slug es válido", () => {
    expect(resolveLaunchTarget("los-del-sabado-abc12")).toBe(routes.group("los-del-sabado-abc12"));
  });

  it.each([undefined, null, "", "Los-Del-Sabado", "abc/def", "../inicio", "//malicioso.com", "https://malicioso.com", "a".repeat(81)])(
    "usa Mis grupos con %j",
    (value) => {
      expect(resolveLaunchTarget(value)).toBe(routes.dashboard);
    },
  );
});

describe("isPrefetchRequest", () => {
  it("detecta los prefetches del router de Next", () => {
    expect(isPrefetchRequest(headers({ "next-router-prefetch": "1" }))).toBe(true);
    expect(isPrefetchRequest(headers({ "next-router-segment-prefetch": "/_tree" }))).toBe(true);
  });

  it("detecta los prefetches del navegador", () => {
    expect(isPrefetchRequest(headers({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetchRequest(headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(isPrefetchRequest(headers({ "Sec-Purpose": "Prefetch" }))).toBe(true);
  });

  it("no marca navegaciones reales", () => {
    expect(isPrefetchRequest(headers())).toBe(false);
    expect(isPrefetchRequest(headers({ rsc: "1" }))).toBe(false);
  });
});

describe("isDocumentNavigation", () => {
  it("reconoce cargas de documento", () => {
    expect(isDocumentNavigation(headers(DOCUMENT))).toBe(true);
  });

  it("descarta los fetch del router, iframes y recursos", () => {
    expect(isDocumentNavigation(headers(ROUTER_FETCH))).toBe(false);
    expect(isDocumentNavigation(headers({ "sec-fetch-dest": "iframe", accept: "text/html" }))).toBe(false);
    expect(isDocumentNavigation(headers({ "sec-fetch-dest": "image" }))).toBe(false);
  });

  it("sin Sec-Fetch-Dest usa el header Accept", () => {
    expect(isDocumentNavigation(headers({ accept: "text/html,*/*;q=0.8" }))).toBe(true);
    expect(isDocumentNavigation(headers({ accept: "*/*" }))).toBe(false);
    expect(isDocumentNavigation(headers())).toBe(false);
  });
});

describe("lastGroupToRemember", () => {
  it("recuerda el grupo de una carga de documento", () => {
    expect(lastGroupToRemember("/g/abc/jugadores", undefined, headers(DOCUMENT))).toBe("abc");
    expect(lastGroupToRemember("/g/abc", "otro-grupo", headers(DOCUMENT))).toBe("abc");
  });

  it("no reescribe la cookie si no cambió", () => {
    expect(lastGroupToRemember("/g/abc/jugadores", "abc", headers(DOCUMENT))).toBeNull();
  });

  it("nunca recuerda un grupo desde un prefetch", () => {
    expect(lastGroupToRemember("/g/abc", "otro-grupo", headers({ ...ROUTER_FETCH, "next-router-prefetch": "1" }))).toBeNull();
    expect(lastGroupToRemember("/g/abc", undefined, headers({ ...DOCUMENT, "sec-purpose": "prefetch" }))).toBeNull();
    expect(lastGroupToRemember("/g/abc", undefined, headers({ ...DOCUMENT, purpose: "prefetch" }))).toBeNull();
  });

  it("ignora los fetch del router, que en el proxy no se distinguen de un prefetch", () => {
    expect(lastGroupToRemember("/g/abc", "otro-grupo", headers(ROUTER_FETCH))).toBeNull();
  });

  it("ignora rutas fuera de un grupo", () => {
    expect(lastGroupToRemember("/inicio", "abc", headers(DOCUMENT))).toBeNull();
  });
});

describe("cookie del último grupo", () => {
  it("dura 180 días, es httpOnly y vale para todo el sitio", () => {
    expect(LAST_GROUP_COOKIE).toBe("fb_last_group");
    expect(LAST_GROUP_COOKIE_OPTIONS).toEqual({ path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 180 });
  });
});
