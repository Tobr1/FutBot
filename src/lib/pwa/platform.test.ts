import { describe, expect, it } from "vitest";
import { detectInstallGuide, getInstallMode, isInAppBrowser, isIOS, isStandaloneDisplay } from "./platform";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 Mobile/15E148 Safari/604.1",
  ipadOld:
    "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1",
  ipadOsDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  androidWhatsApp:
    "Mozilla/5.0 (Linux; Android 14; SM-A146M Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.0.0 Mobile Safari/537.36 WhatsApp/2.25.10.72",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 385.0.0.25.86",
  iphoneFacebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/512.0.0.43.109;FBBV/1;FBDV/iPhone15,2]",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
};

describe("isIOS", () => {
  it("reconoce iPhone y iPad por user agent", () => {
    expect(isIOS(UA.iphoneSafari)).toBe(true);
    expect(isIOS(UA.iphoneChrome)).toBe(true);
    expect(isIOS(UA.ipadOld)).toBe(true);
  });

  it("reconoce iPadOS, que se presenta como Mac pero es táctil", () => {
    expect(isIOS({ userAgent: UA.ipadOsDesktopMode, maxTouchPoints: 5 })).toBe(true);
  });

  it("no confunde una Mac real ni Android", () => {
    expect(isIOS({ userAgent: UA.ipadOsDesktopMode, maxTouchPoints: 0 })).toBe(false);
    expect(isIOS(UA.ipadOsDesktopMode)).toBe(false);
    expect(isIOS(UA.androidChrome)).toBe(false);
    expect(isIOS({ userAgent: UA.windowsChrome, maxTouchPoints: 10 })).toBe(false);
  });
});

describe("isInAppBrowser", () => {
  it.each([UA.androidWhatsApp, UA.iphoneInstagram, UA.iphoneFacebook])("detecta navegadores embebidos", (ua) => {
    expect(isInAppBrowser(ua)).toBe(true);
    expect(isInAppBrowser({ userAgent: ua })).toBe(true);
  });

  it.each([UA.iphoneSafari, UA.iphoneChrome, UA.androidChrome, UA.windowsChrome])("no marca navegadores comunes", (ua) => {
    expect(isInAppBrowser(ua)).toBe(false);
  });
});

describe("isStandaloneDisplay", () => {
  const media = (standalone: boolean) => (query: string) => ({
    matches: standalone && query === "(display-mode: standalone)",
  });

  it("detecta display-mode standalone", () => {
    expect(isStandaloneDisplay({ matchMedia: media(true) })).toBe(true);
    expect(isStandaloneDisplay({ matchMedia: media(false) })).toBe(false);
  });

  it("detecta navigator.standalone de iOS", () => {
    expect(isStandaloneDisplay({ matchMedia: media(false), navigator: { standalone: true } })).toBe(true);
    expect(isStandaloneDisplay({ navigator: { standalone: false } })).toBe(false);
  });

  it("no rompe sin matchMedia o si tira error", () => {
    expect(isStandaloneDisplay({})).toBe(false);
    expect(
      isStandaloneDisplay({
        matchMedia: () => {
          throw new Error("no soportado");
        },
      }),
    ).toBe(false);
  });
});

describe("getInstallMode", () => {
  it("pide abrir en el navegador desde WhatsApp o Instagram, aunque sea iOS", () => {
    expect(getInstallMode(UA.androidWhatsApp, true)).toBe("in-app");
    expect(getInstallMode(UA.iphoneInstagram, false)).toBe("in-app");
  });

  it("muestra las instrucciones de Compartir en iOS", () => {
    expect(getInstallMode(UA.iphoneSafari, false)).toBe("ios");
    expect(getInstallMode({ userAgent: UA.ipadOsDesktopMode, maxTouchPoints: 5 }, false)).toBe("ios");
  });

  it("usa el diálogo nativo solo si se capturó beforeinstallprompt", () => {
    expect(getInstallMode(UA.androidChrome, true)).toBe("prompt");
    expect(getInstallMode(UA.androidChrome, false)).toBeNull();
    expect(getInstallMode(UA.windowsChrome, false)).toBeNull();
  });
});

describe("detectInstallGuide", () => {
  const ua = {
    ...UA,
    iphoneFirefox:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15",
    iphoneGoogleApp:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/380.0.0 Mobile/15E148 Safari/604.1",
    androidFirefox: "Mozilla/5.0 (Android 15; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0",
    androidWebView:
      "Mozilla/5.0 (Linux; Android 14; SM-A146M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.0.0 Mobile Safari/537.36",
  };

  it("iPhone con Safari: guía de Compartir abajo", () => {
    expect(detectInstallGuide(ua.iphoneSafari, false)).toBe("ios-safari");
  });

  it("iPad (también iPadOS como Mac táctil): Compartir arriba", () => {
    expect(detectInstallGuide(ua.ipadOld, false)).toBe("ipad-safari");
    expect(detectInstallGuide({ userAgent: ua.ipadOsDesktopMode, maxTouchPoints: 5 }, false)).toBe("ipad-safari");
  });

  it("Chrome de iPhone tiene su propia guía; Firefox y otros, abrir en Safari", () => {
    expect(detectInstallGuide(ua.iphoneChrome, false)).toBe("ios-chrome");
    expect(detectInstallGuide(ua.iphoneFirefox, false)).toBe("ios-other");
  });

  it("navegadores internos de apps en iOS (Instagram, Facebook, app de Google)", () => {
    expect(detectInstallGuide(ua.iphoneInstagram, false)).toBe("in-app-ios");
    expect(detectInstallGuide(ua.iphoneFacebook, false)).toBe("in-app-ios");
    expect(detectInstallGuide(ua.iphoneGoogleApp, false)).toBe("in-app-ios");
  });

  it("en iOS nunca usa el diálogo nativo aunque exista el evento", () => {
    expect(detectInstallGuide(ua.iphoneSafari, true)).toBe("ios-safari");
  });

  it("Android: diálogo nativo si está disponible, si no, guía del menú", () => {
    expect(detectInstallGuide(ua.androidChrome, true)).toBe("prompt");
    expect(detectInstallGuide(ua.androidChrome, false)).toBe("android-manual");
    expect(detectInstallGuide(ua.androidFirefox, false)).toBe("android-manual");
  });

  it("Android dentro de WhatsApp u otra app: abrir en Chrome", () => {
    expect(detectInstallGuide(ua.androidWhatsApp, true)).toBe("in-app-android");
    expect(detectInstallGuide(ua.androidWebView, false)).toBe("in-app-android");
  });

  it("escritorio: solo con diálogo nativo", () => {
    expect(detectInstallGuide(ua.windowsChrome, true)).toBe("prompt");
    expect(detectInstallGuide(ua.windowsChrome, false)).toBeNull();
  });
});
