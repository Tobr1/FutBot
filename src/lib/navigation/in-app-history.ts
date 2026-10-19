import { AUTH_PAGES } from "@/lib/routes";

/*
 * ¿Hay una pantalla de la app detrás de la actual en el historial?
 * Sirve para que "Volver" haga history.back() (sin apilar entradas) y solo
 * navegue a la pantalla padre cuando se entró directo por un link o desde la
 * app instalada.
 */

interface NavigationEntryLike {
  url: string | null;
  index: number;
}
interface NavigationLike {
  currentEntry: NavigationEntryLike | null;
  entries(): NavigationEntryLike[];
}

/** Respaldo para navegadores sin Navigation API: cuenta navegaciones dentro de la app. */
let softNavigations = 0;

export function markSoftNavigation() {
  softNavigations += 1;
}

function isAppScreen(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== window.location.origin) return false;
    return parsed.pathname !== "/" && !AUTH_PAGES.some((page) => parsed.pathname.startsWith(page));
  } catch {
    return false;
  }
}

export function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;
  const current = navigation?.currentEntry;
  if (navigation && current) {
    // entries() solo lista las entradas del mismo origen contiguas a la actual.
    const previous = navigation.entries().find((entry) => entry.index === current.index - 1);
    return isAppScreen(previous?.url ?? null);
  }
  return softNavigations > 0;
}
