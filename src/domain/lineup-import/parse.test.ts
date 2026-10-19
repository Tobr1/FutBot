import { describe, expect, it } from "vitest";
import { extractDayHint, extractTimeHint, parseLineup } from "./parse";

const README_LIST =
  "Sábado 22 hs\n\n1. Brito\n2. Manu\n3. Vece\n4. Paramo\n5. Tadeo\n6. Fran\n7. Boni\n8. Matías\n9. Gero\n10. Juanchi\n11. Lucas\n12. Nacho";

const names = (text: string) => parseLineup(text).entries.map((e) => e.name);

describe("parseLineup", () => {
  it("interpreta la lista de ejemplo del README", () => {
    const result = parseLineup(README_LIST);
    expect(result.header).toEqual({ raw: "Sábado 22 hs", dayHint: "sábado", timeHint: "22:00" });
    expect(result.entries.map((e) => e.name)).toEqual([
      "Brito",
      "Manu",
      "Vece",
      "Paramo",
      "Tadeo",
      "Fran",
      "Boni",
      "Matías",
      "Gero",
      "Juanchi",
      "Lucas",
      "Nacho",
    ]);
    expect(result.entries.map((e) => e.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(result.entries.every((e) => e.section === "confirmed" && e.positionHint === null)).toBe(true);
    expect(result.entries[9].raw).toBe("10. Juanchi");
    expect(result.ignored).toEqual([]);
  });

  it("acepta todos los estilos de numeración", () => {
    const text = ["1. Brito", "2) Manu", "3 - Vece", "4- Paramo", "05. Tadeo", "6 Fran", "7: Boni", "8.Gero"].join("\n");
    expect(names(text)).toEqual(["Brito", "Manu", "Vece", "Paramo", "Tadeo", "Fran", "Boni", "Gero"]);
  });

  it("acepta numeración con emojis (incluido 🔟)", () => {
    const text = "1️⃣ Brito\n2️⃣ Manu\n3⃣ Vece\n🔟 Juanchi\n1️⃣1️⃣ Lucas";
    expect(names(text)).toEqual(["Brito", "Manu", "Vece", "Juanchi", "Lucas"]);
  });

  it("acepta viñetas y quita emojis y marcas", () => {
    const text = "• Brito ✅\n- Manu ⚽\n* Vece 🔥\n· Paramo\n-Tadeo\n⚽ 5. Fran ✔️\n*Boni*";
    expect(names(text)).toEqual(["Brito", "Manu", "Vece", "Paramo", "Tadeo", "Fran", "Boni"]);
  });

  it("detecta la posición y la saca del nombre", () => {
    const result = parseLineup(
      [
        "1. Brito (arq)",
        "2. Manu (arquero) ✅",
        "3. Vece arq",
        "4. Paramo (def)",
        "5. Tadeo (del)",
        "6. Fran - med",
        "7. Boni 🧤",
        "8. Gero (amigo de Fran)",
        "9. Juan Cruz",
      ].join("\n"),
    );
    expect(result.entries.map((e) => [e.name, e.positionHint])).toEqual([
      ["Brito", "goalkeeper"],
      ["Manu", "goalkeeper"],
      ["Vece", "goalkeeper"],
      ["Paramo", "defender"],
      ["Tadeo", "forward"],
      ["Fran", "midfielder"],
      ["Boni", "goalkeeper"],
      ["Gero", null],
      ["Juan Cruz", null],
    ]);
  });

  it("no confunde un nombre de una palabra con una posición", () => {
    expect(parseLineup("1. Del\n2. Punta").entries.map((e) => [e.name, e.positionHint])).toEqual([
      ["Del", null],
      ["Punta", null],
    ]);
  });

  it("pasa a suplentes después del separador (con o sin acentos, dos puntos o emojis)", () => {
    const text = "1. Brito\n2. Manu\n\nSuplentes:\n1. Vece\n2. Paramo";
    const result = parseLineup(text);
    expect(result.entries.map((e) => [e.name, e.section, e.order])).toEqual([
      ["Brito", "confirmed", 1],
      ["Manu", "confirmed", 2],
      ["Vece", "reserve", 3],
      ["Paramo", "reserve", 4],
    ]);
    for (const marker of ["RESERVAS", "Lista de espera:", "*Banco*", "🔄 Suplentes (por orden)", "suplente"]) {
      const parsed = parseLineup(`1. Brito\n${marker}\nVece`);
      expect(parsed.entries.map((e) => e.section)).toEqual(["confirmed", "reserve"]);
    }
  });

  it("acepta suplentes en la misma línea separados por coma", () => {
    const result = parseLineup("1. Brito\nSuplentes: Vece, Paramo y Tadeo");
    expect(result.entries.map((e) => [e.name, e.section])).toEqual([
      ["Brito", "confirmed"],
      ["Vece", "reserve"],
      ["Paramo", "reserve"],
      ["Tadeo", "reserve"],
    ]);
  });

  it("descarta bajas", () => {
    const text = [
      "1. Brito",
      "2. ~Manu~",
      "3. Vece ❌",
      "4. Paramo (baja)",
      "5. Tadeo no voy",
      "6. Fran",
      "Baja: Boni",
      "7. Gero",
      "",
      "Bajas:",
      "Lucas",
      "Nacho",
    ].join("\n");
    const result = parseLineup(text);
    expect(result.entries.map((e) => e.name)).toEqual(["Brito", "Fran", "Gero"]);
    expect(result.ignored).toEqual([
      "2. ~Manu~",
      "3. Vece ❌",
      "4. Paramo (baja)",
      "5. Tadeo no voy",
      "Baja: Boni",
      "Lucas",
      "Nacho",
    ]);
  });

  it("ignora cupos vacíos", () => {
    const result = parseLineup("1. Brito\n2. Manu\n3.\n4. -\n5. ...\n6. ✅\n7)");
    expect(result.entries.map((e) => e.name)).toEqual(["Brito", "Manu"]);
    expect(result.ignored).toEqual(["3.", "4. -", "5. ...", "6. ✅", "7)"]);
  });

  it("quita los prefijos de un chat de WhatsApp", () => {
    const text = [
      "[16/10 21:03] Juan: Fútbol jueves 21:30 - La Canchita",
      "1. Brito",
      "[16/10/26, 21:05:12] Manu: 2. Manu",
      "16/10/26 21:07 - Vece: 3. Vece",
    ].join("\n");
    const result = parseLineup(text);
    expect(result.header).toEqual({
      raw: "Fútbol jueves 21:30 - La Canchita",
      dayHint: "jueves",
      timeHint: "21:30",
    });
    expect(result.entries.map((e) => e.name)).toEqual(["Brito", "Manu", "Vece"]);
  });

  it("une varias líneas de encabezado antes de la primera entrada", () => {
    const result = parseLineup("⚽ FÚTBOL ⚽\nMañana 21.30\nCancha 3\n\n1. Brito");
    expect(result.header.raw).toBe("⚽ FÚTBOL ⚽\nMañana 21.30\nCancha 3");
    expect(result.header.dayHint).toBe("mañana");
    expect(result.header.timeHint).toBe("21:30");
  });

  it("devuelve encabezado vacío si no lo hay", () => {
    expect(parseLineup("1. Brito\n2. Manu").header).toEqual({ raw: null, dayHint: null, timeHint: null });
    expect(parseLineup("").entries).toEqual([]);
  });

  it("acepta listas sin numerar y detecta el encabezado igual", () => {
    const result = parseLineup("Hoy 20hs\nBrito\nManu\nVece");
    expect(result.header).toMatchObject({ dayHint: "hoy", timeHint: "20:00" });
    expect(result.entries.map((e) => e.name)).toEqual(["Brito", "Manu", "Vece"]);
    // Sin encabezado reconocible, la primera línea ya es un jugador.
    expect(names("Brito\nManu")).toEqual(["Brito", "Manu"]);
  });

  it("descarta texto que no es un nombre después de la lista", () => {
    const result = parseLineup("1. Brito\n2. Manu\nConfirmen antes de las 20 hs porfa que hay que reservar");
    expect(names("1. Brito\n2. Manu")).toEqual(["Brito", "Manu"]);
    expect(result.entries.map((e) => e.name)).toEqual(["Brito", "Manu"]);
    expect(result.ignored).toHaveLength(1);
  });

  it("conserva mayúsculas y acentos pero limpia espacios", () => {
    expect(names("1.   Juan    Cruz  \n2. MATÍAS\n3. josé maría")).toEqual(["Juan Cruz", "MATÍAS", "josé maría"]);
  });

  it("se queda con la primera aparición de un nombre repetido", () => {
    const result = parseLineup("1. Matías\n2. Brito\n3. MATIAS\n4. matías ✅");
    expect(result.entries.map((e) => e.name)).toEqual(["Matías", "Brito"]);
    expect(result.ignored).toEqual(["3. MATIAS", "4. matías ✅"]);
  });

  it("quita el +1 de quien trae un invitado", () => {
    expect(names("1. Brito +1")).toEqual(["Brito"]);
  });
});

describe("extractDayHint / extractTimeHint", () => {
  it("reconoce días con y sin acento", () => {
    expect(extractDayHint("MIERCOLES 21")).toBe("miércoles");
    expect(extractDayHint("sabado")).toBe("sábado");
    expect(extractDayHint("Sábado a la mañana")).toBe("sábado");
    expect(extractDayHint("mañana 22")).toBe("mañana");
    expect(extractDayHint("Partido")).toBeNull();
  });

  it("normaliza horas", () => {
    expect(extractTimeHint("22 hs")).toBe("22:00");
    expect(extractTimeHint("22hs")).toBe("22:00");
    expect(extractTimeHint("22:30")).toBe("22:30");
    expect(extractTimeHint("21.30")).toBe("21:30");
    expect(extractTimeHint("9 hs")).toBe("09:00");
    expect(extractTimeHint("a las 9")).toBe("09:00");
    expect(extractTimeHint("21.30hs")).toBe("21:30");
    expect(extractTimeHint("25 hs")).toBeNull();
    expect(extractTimeHint("Sábado 22/10")).toBeNull();
  });
});
