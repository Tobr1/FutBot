/**
 * Lo mínimo de un elemento del DOM que necesita findErrorFocusTarget (así se
 * puede probar sin navegador).
 */
export interface QueryableElement {
  getAttribute(name: string): string | null;
  querySelector(selectors: string): QueryableElement | null;
}

const RADIO = '[role="radio"]:not(:disabled):not([aria-disabled="true"])';
const NATIVE_RADIO = 'input[type="radio"]:not(:disabled):not([aria-hidden="true"])';

/**
 * Elemento que debe recibir el foco después de un error del servidor: el
 * primer campo con aria-invalid o, si no hay ninguno, el FormMessage.
 *
 * Si el campo inválido es un radiogroup (o contiene radios, como ChoiceCards)
 * el contenedor no es enfocable: el foco va a la opción elegida o, si no hay,
 * a la primera habilitada.
 */
export function findErrorFocusTarget<T extends QueryableElement>(form: T): T | null {
  const invalid = form.querySelector('[aria-invalid="true"]') as T | null;
  if (!invalid) return form.querySelector("[data-form-message]") as T | null;
  return (radioTarget(invalid) as T | null) ?? invalid;
}

function radioTarget(field: QueryableElement): QueryableElement | null {
  const isGroup = field.getAttribute("role") === "radiogroup";
  const hasRadios = isGroup || field.querySelector('[role="radio"], input[type="radio"]') !== null;
  if (!hasRadios) return null;
  return (
    field.querySelector(`${RADIO}[data-state="checked"], ${RADIO}[aria-checked="true"]`) ??
    field.querySelector(`${NATIVE_RADIO}:checked`) ??
    field.querySelector(RADIO) ??
    field.querySelector(NATIVE_RADIO)
  );
}
