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
