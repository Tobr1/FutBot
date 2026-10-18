import { type RefObject, useEffect } from "react";
import type { ActionState } from "@/lib/action-result";
import { findErrorFocusTarget } from "@/lib/form-error-target";

/**
 * Después de un error de la Server Action, lleva el foco (y el scroll) al
 * primer campo marcado con aria-invalid o, si no hay ninguno, al FormMessage.
 * Si el campo es un radiogroup (ChoiceCards, pickers), el foco va a su opción
 * elegida o a la primera habilitada. En el teléfono el error suele quedar
 * fuera de pantalla: sin esto, el usuario solo ve que "no pasó nada".
 *
 *   const formRef = useRef<HTMLFormElement>(null);
 *   const [state, action] = useActionState(saveAction, idleState);
 *   useFormErrorFocus(formRef, state);
 *   return <form ref={formRef} action={action}>…</form>;
 */
export function useFormErrorFocus(formRef: RefObject<HTMLFormElement | null>, state: ActionState) {
  useEffect(() => {
    if (state.status !== "error") return;
    const form = formRef.current;
    if (!form) return;

    const target = findErrorFocusTarget<Element>(form);
    if (!(target instanceof HTMLElement)) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [formRef, state]);
}
