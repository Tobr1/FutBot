/**
 * Clave pública VAPID de los avisos al celular. Es pública por diseño (el
 * navegador la usa para suscribirse); la privada vive solo en el servidor
 * (VAPID_PRIVATE_KEY). Si se rota una, se rotan las dos y se recarga el hash
 * de la clave de despacho en la base (ver migración push_notifications).
 */
export const VAPID_PUBLIC_KEY = "BA_kw-l57TXMZI_ldDSvRTPTsw6TSMmFrJHr0roSX9Bi03VdM0AeJ3CZOofNP8Pn9YAX9dBRGJyVgqmOuMExnZ0";

/** Ruta del service worker (public/sw.js). */
export const SERVICE_WORKER_URL = "/sw.js";
