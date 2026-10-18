"use client";

import { useActionState, useRef } from "react";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { fieldAria, FormField, groupAria } from "@/components/shared/form-field";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { idleState } from "@/lib/action-result";
import { createGroupAction } from "../actions";
import { PlayersPerTeamPicker } from "./players-per-team-picker";

export function CreateGroupForm({ defaultNickname }: { defaultNickname: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createGroupAction, idleState);
  useFormErrorFocus(formRef, state);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form ref={formRef} action={action} className="grid gap-6" noValidate>
      <FormMessage state={state} />

      <FormField id="name" label="Nombre del grupo" errors={errors?.name}>
        <Input
          {...fieldAria("name", errors?.name)}
          placeholder="Ej.: Los del Sábado"
          defaultValue={values?.name}
          maxLength={60}
          required
          autoCapitalize="sentences"
          enterKeyHint="next"
        />
      </FormField>

      <FormField id="description" label="Descripción (opcional)" hint="Dónde y cuándo juegan, reglas de la casa…" errors={errors?.description}>
        <Textarea
          {...fieldAria("description", errors?.description, true)}
          placeholder="Sábados 22 h en La Canchita. Se paga en el día."
          defaultValue={values?.description}
          maxLength={280}
          rows={3}
        />
      </FormField>

      <FormField id="playersPerTeam" control="group" label="Formato habitual" errors={errors?.playersPerTeam}>
        <PlayersPerTeamPicker
          {...groupAria("playersPerTeam", errors?.playersPerTeam)}
          name="playersPerTeam"
          defaultValue={Number(values?.playersPerTeam ?? 5)}
        />
      </FormField>

      <FormField
        id="nickname"
        label="Tu apodo en el grupo (opcional)"
        hint="Creamos tu ficha de jugador con este nombre. Dejalo vacío si no jugás."
        errors={errors?.nickname}
      >
        <Input
          {...fieldAria("nickname", errors?.nickname, true)}
          defaultValue={values?.nickname ?? defaultNickname}
          maxLength={30}
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
      </FormField>

      <StickyActionBar>
        <SubmitButton size="lg" pendingText="Creando grupo…" className="w-full lg:w-auto">
          Crear grupo
        </SubmitButton>
      </StickyActionBar>
    </form>
  );
}
