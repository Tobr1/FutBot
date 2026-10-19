import { describe, expect, it } from "vitest";
import {
  addDays,
  dateChipParts,
  daysBetween,
  formatMatchDate,
  formatMatchDay,
  formatStamp,
  isoToZoned,
  isValidDateIso,
  isValidTime,
  relativeDayLabel,
  resolveDayHint,
  weekdayOf,
  zonedDateTimeToIso,
} from "./datetime";

const BA = "America/Argentina/Buenos_Aires";

describe("validaciones", () => {
  it("acepta fechas reales y rechaza las imposibles", () => {
    expect(isValidDateIso("2026-10-25")).toBe(true);
    expect(isValidDateIso("2028-02-29")).toBe(true);
    expect(isValidDateIso("2026-02-29")).toBe(false);
    expect(isValidDateIso("2026-13-01")).toBe(false);
    expect(isValidDateIso("25/10/2026")).toBe(false);
  });

  it("acepta horas de 24 h", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
  });
});

describe("zonedDateTimeToIso", () => {
  it("convierte la hora local de Buenos Aires (UTC−3) a UTC", () => {
    expect(zonedDateTimeToIso("2026-10-25", "22:00", BA)).toBe("2026-10-26T01:00:00.000Z");
    expect(zonedDateTimeToIso("2026-01-01", "00:30", BA)).toBe("2026-01-01T03:30:00.000Z");
  });

  it("respeta el horario de verano", () => {
    // Madrid: invierno UTC+1, verano UTC+2.
    expect(zonedDateTimeToIso("2026-01-15", "20:00", "Europe/Madrid")).toBe("2026-01-15T19:00:00.000Z");
    expect(zonedDateTimeToIso("2026-07-15", "20:00", "Europe/Madrid")).toBe("2026-07-15T18:00:00.000Z");
  });

  it("una hora que no existe (adelanto) se corre hacia adelante, nunca al día anterior", () => {
    // Santiago: el 6/9/2026 a las 00:00 pasa a 01:00 (UTC−4 → UTC−3).
    const santiago = zonedDateTimeToIso("2026-09-06", "00:30", "America/Santiago");
    expect(isoToZoned(santiago, "America/Santiago")).toMatchObject({ date: "2026-09-06", time: "01:30" });
    expect(zonedDateTimeToIso("2026-09-06", "00:00", "America/Santiago")).toBe("2026-09-06T04:00:00.000Z");
    // Nueva York: el 8/3/2026 a las 02:00 pasa a 03:00.
    expect(zonedDateTimeToIso("2026-03-08", "02:30", "America/New_York")).toBe("2026-03-08T07:30:00.000Z");
    // Madrid: el 29/3/2026 a las 02:00 pasa a 03:00.
    expect(zonedDateTimeToIso("2026-03-29", "02:30", "Europe/Madrid")).toBe("2026-03-29T01:30:00.000Z");
  });

  it("una hora repetida (atraso) es la primera", () => {
    expect(zonedDateTimeToIso("2026-11-01", "01:30", "America/New_York")).toBe("2026-11-01T05:30:00.000Z");
    expect(zonedDateTimeToIso("2026-10-25", "02:30", "Europe/Madrid")).toBe("2026-10-25T00:30:00.000Z");
  });

  it("la fecha local nunca cambia (todo el año, cada media hora, varias zonas)", () => {
    for (const zone of ["America/Santiago", "America/New_York", "Europe/Madrid", "Australia/Sydney", "America/Asuncion", BA]) {
      for (let d = 0; d < 366; d += 1) {
        const date = addDays("2026-01-01", d);
        for (const time of ["00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "23:30"]) {
          const local = isoToZoned(zonedDateTimeToIso(date, time, zone), zone);
          expect(local.date).toBe(date);
          expect(local.time >= time).toBe(true);
        }
      }
    }
  });

  it("funciona en UTC", () => {
    expect(zonedDateTimeToIso("2026-10-25", "22:00", "UTC")).toBe("2026-10-25T22:00:00.000Z");
  });

  it("rechaza datos inválidos", () => {
    expect(() => zonedDateTimeToIso("2026-02-30", "10:00", BA)).toThrow(RangeError);
    expect(() => zonedDateTimeToIso("2026-02-10", "25:00", BA)).toThrow(RangeError);
  });

  it("es la inversa de isoToZoned", () => {
    const iso = zonedDateTimeToIso("2026-03-29", "21:15", "Europe/Madrid");
    expect(isoToZoned(iso, "Europe/Madrid")).toMatchObject({ date: "2026-03-29", time: "21:15" });
  });
});

describe("isoToZoned", () => {
  it("devuelve fecha, hora y día de semana locales", () => {
    // 01:00 UTC del lunes = 22:00 del domingo en Buenos Aires.
    expect(isoToZoned("2026-10-26T01:00:00Z", BA)).toEqual({ date: "2026-10-25", time: "22:00", weekday: 0 });
  });
});

describe("formatos", () => {
  it("formatea el día del partido", () => {
    expect(formatMatchDay("2026-10-25T01:00:00Z", BA)).toBe("Sáb 24/10 · 22:00");
    expect(formatMatchDate("2026-10-25T01:00:00Z", BA)).toBe("Sáb 24/10");
  });

  it("arma el chip de fecha", () => {
    expect(dateChipParts("2026-10-25T01:00:00Z", BA)).toEqual({
      weekday: "Sáb",
      day: "24",
      month: "oct",
      time: "22:00",
      date: "2026-10-24",
    });
  });
});

describe("aritmética de fechas", () => {
  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("cuenta días entre fechas", () => {
    expect(daysBetween("2026-10-19", "2026-10-25")).toBe(6);
    expect(daysBetween("2026-10-25", "2026-10-19")).toBe(-6);
  });

  it("calcula el día de semana", () => {
    expect(weekdayOf("2026-10-19")).toBe(1);
    expect(weekdayOf("2026-10-24")).toBe(6);
  });

  it("etiqueta hoy, mañana y ayer", () => {
    expect(relativeDayLabel("2026-10-19", "2026-10-19")).toBe("Hoy");
    expect(relativeDayLabel("2026-10-20", "2026-10-19")).toBe("Mañana");
    expect(relativeDayLabel("2026-10-18", "2026-10-19")).toBe("Ayer");
    expect(relativeDayLabel("2026-10-25", "2026-10-19")).toBeNull();
  });
});

describe("resolveDayHint", () => {
  const monday = "2026-10-19";

  it("resuelve hoy y mañana", () => {
    expect(resolveDayHint("hoy", monday)).toBe(monday);
    expect(resolveDayHint("mañana", monday)).toBe("2026-10-20");
  });

  it("elige la próxima ocurrencia del día, contando hoy", () => {
    expect(resolveDayHint("sábado", monday)).toBe("2026-10-24");
    expect(resolveDayHint("lunes", monday)).toBe(monday);
    expect(resolveDayHint("domingo", monday)).toBe("2026-10-25");
    expect(resolveDayHint("miércoles", "2026-10-24")).toBe("2026-10-28");
  });
});

describe("formatStamp", () => {
  const now = new Date("2026-10-19T18:00:00Z"); // 15:00 en Buenos Aires

  it("usa Hoy y Ayer con la hora", () => {
    expect(formatStamp("2026-10-19T17:32:00Z", BA, now)).toBe("Hoy 14:32");
    expect(formatStamp("2026-10-19T00:10:00Z", BA, now)).toBe("Ayer 21:10");
  });

  it("muestra día y fecha dentro del año, y la fecha completa en otro año", () => {
    expect(formatStamp("2026-10-13T21:00:00Z", BA, now)).toBe("Mar 13/10 · 18:00");
    expect(formatStamp("2025-12-20T21:00:00Z", BA, now)).toBe("20/12/2025");
  });
});
