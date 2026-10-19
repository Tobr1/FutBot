"use client";

import { fieldAria, FormField, groupAria } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlayersPerTeamPicker } from "@/features/groups/components/players-per-team-picker";

type Errors = Record<string, string[] | undefined> | undefined;

/**
 * Datos del partido: fecha, hora, cancha, formato y notas. Fecha y hora
 * son controladas (el importador puede completarlas desde la lista).
 * Las horas se interpretan en la zona horaria del grupo.
 */
export function MatchFields({
  errors,
  date,
  time,
  onDateChange,
  onTimeChange,
  defaultVenue = "",
  defaultPlayersPerTeam,
  defaultNotes = "",
  onPlayersPerTeamChange,
  timeZoneLabel,
}: {
  errors: Errors;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  defaultVenue?: string;
  defaultPlayersPerTeam: number;
  defaultNotes?: string;
  onPlayersPerTeamChange?: (value: number) => void;
  /** Aclaración de la zona horaria si no es la de Buenos Aires. */
  timeZoneLabel?: string;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <FormField id="date" label="Fecha" errors={errors?.date}>
          <Input
            {...fieldAria("date", errors?.date)}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            enterKeyHint="next"
            required
            className="[color-scheme:dark]"
          />
        </FormField>
        <FormField id="time" label="Hora" errors={errors?.time}>
          <Input
            {...fieldAria("time", errors?.time)}
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            step={300}
            enterKeyHint="next"
            required
            className="[color-scheme:dark]"
          />
        </FormField>
      </div>
      {timeZoneLabel && <p className="-mt-3 text-xs text-muted-foreground">Hora de {timeZoneLabel}.</p>}

      <FormField id="venue" label="Cancha (opcional)" errors={errors?.venue}>
        <Input
          {...fieldAria("venue", errors?.venue)}
          defaultValue={defaultVenue}
          placeholder="Ej.: Complejo El Potrero, cancha 3"
          maxLength={80}
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="next"
        />
      </FormField>

      <FormField id="playersPerTeam" control="group" label="Formato" errors={errors?.playersPerTeam}>
        <PlayersPerTeamPicker
          name="playersPerTeam"
          defaultValue={defaultPlayersPerTeam}
          onValueChange={onPlayersPerTeamChange}
          {...groupAria("playersPerTeam", errors?.playersPerTeam)}
        />
      </FormField>

      <FormField id="notes" label="Notas (opcional)" hint="Lo ve todo el grupo." errors={errors?.notes}>
        <Textarea
          {...fieldAria("notes", errors?.notes, true)}
          defaultValue={defaultNotes}
          placeholder="Ej.: llevar pecheras, se paga en la cancha"
          maxLength={500}
          rows={2}
          autoCapitalize="sentences"
          enterKeyHint="done"
        />
      </FormField>
    </div>
  );
}
