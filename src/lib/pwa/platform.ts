/**
 * Detección de plataforma para invitar a instalar la app. Funciones puras: reciben
 * el user agent (o un objeto tipo navigator/window), así se testean sin navegador.
 */

export interface NavigatorLike {
  userAgent: string;
  maxTouchPoints?: number;
}

type UserAgentSource = string | NavigatorLike;

export interface DisplayEnvironment {
  matchMedia?: (query: string) => { matches: boolean };
  /** Safari de iOS expone navigator.standalone en apps agregadas a inicio. */
  navigator?: { standalone?: boolean };
}

/** Evento de Chrome/Android que permite mostrar el diálogo de instalación propio. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    /** Lo captura src/instrumentation-client.ts antes de hidratar. */
    __fbInstallPrompt?: BeforeInstallPromptEvent;
  }
}

/** Se dispara en window cuando hay un beforeinstallprompt capturado. */
export const INSTALLABLE_EVENT = "fb:installable";

/** Clave de localStorage: el usuario cerró la invitación a instalar. */
export const INSTALL_DISMISSED_KEY = "fb:install-dismissed";

function userAgentOf(source: UserAgentSource): string {
  return typeof source === "string" ? source : (source.userAgent ?? "");
}

/** iPhone, iPod o iPad (iPadOS se presenta como Macintosh, pero con pantalla táctil). */
export function isIOS(source: UserAgentSource): boolean {
  const userAgent = userAgentOf(source);
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  const touchPoints = typeof source === "string" ? 0 : (source.maxTouchPoints ?? 0);
  return touchPoints > 1 && /Macintosh/.test(userAgent);
}

/** Navegadores embebidos (WhatsApp, Facebook, Instagram): ahí no se puede instalar. */
export function isInAppBrowser(source: UserAgentSource): boolean {
  return /WhatsApp|FBAN|FBAV|Instagram/.test(userAgentOf(source));
}

/** La app ya corre instalada (pantalla completa, sin barra del navegador). */
export function isStandaloneDisplay(env: DisplayEnvironment): boolean {
  if (env.navigator?.standalone === true) return true;
  try {
    return env.matchMedia?.("(display-mode: standalone)").matches === true;
  } catch {
    return false;
  }
}

/** iPad (incluido iPadOS, que se presenta como Mac táctil). */
export function isIPad(source: UserAgentSource): boolean {
  const userAgent = userAgentOf(source);
  if (/iPad/.test(userAgent)) return true;
  const touchPoints = typeof source === "string" ? 0 : (source.maxTouchPoints ?? 0);
  return touchPoints > 1 && /Macintosh/.test(userAgent);
}

/**
 * Qué guía de instalación mostrar:
 * - prompt: el navegador ofrece su diálogo de instalación (Chrome/Edge/Samsung en Android o escritorio).
 * - ios-safari / ipad-safari: Compartir → "Agregar a inicio" (abajo en iPhone, arriba en iPad).
 * - ios-chrome: Chrome de iPhone/iPad, Compartir en la barra de direcciones.
 * - ios-other: Firefox, Edge u otros en iOS: conviene abrirlo en Safari.
 * - in-app-ios / in-app-android: navegador interno de Instagram, Facebook, WhatsApp, Google…
 * - android-manual: Android sin diálogo (Firefox, o el diálogo ya se usó): menú → "Instalar".
 * null: no hay forma de instalar (escritorio sin soporte).
 */
export type InstallGuide =
  | "prompt"
  | "ios-safari"
  | "ipad-safari"
  | "ios-chrome"
  | "ios-other"
  | "in-app-ios"
  | "in-app-android"
  | "android-manual";

const IN_APP_IOS = /FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\/|Snapchat|TikTok|musical_ly|Twitter/;

export function detectInstallGuide(source: UserAgentSource, canPrompt: boolean): InstallGuide | null {
  const userAgent = userAgentOf(source);
  if (isIOS(source)) {
    if (IN_APP_IOS.test(userAgent)) return "in-app-ios";
    if (/CriOS/.test(userAgent)) return "ios-chrome";
    if (/FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/.test(userAgent)) return "ios-other";
    return isIPad(source) ? "ipad-safari" : "ios-safari";
  }
  if (/Android/.test(userAgent)) {
    if (isInAppBrowser(source) || /; wv\)/.test(userAgent)) return "in-app-android";
    return canPrompt ? "prompt" : "android-manual";
  }
  return canPrompt ? "prompt" : null;
}

export type InstallMode = "in-app" | "ios" | "prompt";

/**
 * Qué invitación mostrar: abrir en el navegador (in-app), instrucciones de
 * Compartir (iOS) o el botón con el diálogo nativo (Android con el evento
 * capturado). null si no hay forma de instalar.
 */
export function getInstallMode(source: UserAgentSource, canPrompt: boolean): InstallMode | null {
  if (isInAppBrowser(source)) return "in-app";
  if (isIOS(source)) return "ios";
  return canPrompt ? "prompt" : null;
}
