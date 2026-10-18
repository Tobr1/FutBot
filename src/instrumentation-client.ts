import { type BeforeInstallPromptEvent, INSTALLABLE_EVENT } from "@/lib/pwa/platform";

// Chrome/Android puede disparar beforeinstallprompt antes de que hidrate React:
// lo guardamos para que InstallAppCard ofrezca "Instalar app" con el diálogo nativo.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__fbInstallPrompt = event as BeforeInstallPromptEvent;
  window.dispatchEvent(new Event(INSTALLABLE_EVENT));
});
