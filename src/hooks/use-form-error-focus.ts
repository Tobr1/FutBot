import { type RefObject, useEffect } from "react";
import type { ActionState } from "@/lib/action-result";

/**
 * Después de un error de la Server Action, lleva el foco (y el scroll) al
 * primer campo marcado con aria-invalid o, si no hay ninguno, al FormMessage.
 * En el teléfono el error suele quedar fuera de pantalla: sin esto, el
 * usuario solo ve que "no pasó nada".
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

    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.querySelector<HTMLElement>("[data-form-message]");
    if (!target) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [formRef, state]);
}
