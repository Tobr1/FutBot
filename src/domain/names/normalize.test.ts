import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../../../supabase/tests/helpers/test-db";
import { initials, normalizeName, slugify } from "./normalize";

const SAMPLES = [
  "Brito",
  "  Juán  Cruz. ",
  "ÑOÑO_10",
  "Lucas G.",
  "José-María",
  "⚽",
  "",
  "Gerónimo (arq)",
  "MATÍAS",
  "Ü ber",
  "n°7",
];

describe("normalizeName", () => {
  it("ignora mayúsculas, acentos, signos y espacios repetidos", () => {
    expect(normalizeName("  Juán  Cruz. ")).toBe("juan cruz");
    expect(normalizeName("ÑOÑO_10")).toBe("nono 10");
    expect(normalizeName("José-María")).toBe("jose maria");
  });

  it("devuelve null si no quedan letras ni números", () => {
    expect(normalizeName("⚽")).toBeNull();
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName(null)).toBeNull();
  });

  describe("paridad con public.normalize_name()", () => {
    let t: TestDb;

    beforeAll(async () => {
      t = await createTestDb();
    });

    afterAll(async () => {
      await t?.close();
    });

    it.each(SAMPLES)("%j produce el mismo resultado en TS y en SQL", async (sample) => {
      const [row] = await t.sql<{ value: string | null }>("select public.normalize_name($1) as value", [sample]);
      expect(normalizeName(sample)).toBe(row.value);
    });
  });
});

describe("slugify", () => {
  it("convierte en slug", () => {
    expect(slugify("Fútbol del Jueves")).toBe("futbol-del-jueves");
    expect(slugify("!!!")).toBeNull();
  });
});

describe("initials", () => {
  it("toma dos letras", () => {
    expect(initials("Juan Cruz")).toBe("JC");
    expect(initials("brito")).toBe("BR");
    expect(initials("⚽")).toBe("?");
  });
});
