import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, addMemberWithPlayer, createGroupWithAdmin, type GroupFixture } from "./helpers/fixtures";
import { createTestDb, expectDbError, type TestDb } from "./helpers/test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t?.close();
});

interface Attrs {
  player_id: string;
  kind: string;
  a1: string;
  a6: string;
  has_self: boolean;
  validators: number;
}

const selfAssess = (userId: string, g: GroupFixture, values: number[]) =>
  t.rpc(userId, "save_self_assessment", { p_group_id: g.groupId, p_values: values });
const validate = (userId: string, playerId: string, values: number[]) =>
  t.rpc(userId, "save_attribute_validation", { p_player_id: playerId, p_values: values });

async function attrsOf(asUser: string, g: GroupFixture, playerId: string) {
  const rows = await t.rpc<Attrs>(asUser, "get_group_attributes", { p_group_id: g.groupId });
  return rows.find((r) => r.player_id === playerId);
}

describe("atributos de carta", () => {
  it("la autoevaluación sola publica sus valores, provisional y sin validadores", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    await selfAssess(fran.userId, g, [70, 60, 65, 72, 50, 68]);
    const row = await attrsOf(g.adminId, g, fran.playerId);
    expect(row?.kind).toBe("field");
    expect(Number(row?.a1)).toBe(70);
    expect(row?.has_self).toBe(true);
    expect(row?.validators).toBe(0);
  });

  it("valor publicado = 20 % autoevaluación + 80 % promedio de compañeros", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const a = await addMemberWithPlayer(t, g, "A");
    const b = await addMemberWithPlayer(t, g, "B");
    await selfAssess(fran.userId, g, [90, 90, 90, 90, 90, 90]);
    await validate(a.userId, fran.playerId, [60, 60, 60, 60, 60, 40]);
    await validate(b.userId, fran.playerId, [70, 70, 70, 70, 70, 50]);
    const row = await attrsOf(a.userId, g, fran.playerId);
    // 0.2 * 90 + 0.8 * 65 = 70 ; 0.2 * 90 + 0.8 * 45 = 54
    expect(Number(row?.a1)).toBe(70);
    expect(Number(row?.a6)).toBe(54);
    expect(row?.validators).toBe(2);
  });

  it("con 5 o más validaciones descarta el valor más alto y el más bajo", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const scores = [10, 60, 60, 60, 99];
    for (const [i, score] of scores.entries()) {
      const v = await addMemberWithPlayer(t, g, `V${i}`);
      await validate(v.userId, fran.playerId, [score, 50, 50, 50, 50, 50]);
    }
    const row = await attrsOf(g.adminId, g, fran.playerId);
    // Sin autoevaluación: promedio robusto de 60, 60, 60.
    expect(Number(row?.a1)).toBe(60);
    expect(row?.validators).toBe(5);
    expect(row?.has_self).toBe(false);
  });

  it("validar de nuevo reemplaza la validación anterior (una por compañero)", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const a = await addMemberWithPlayer(t, g, "A");
    await validate(a.userId, fran.playerId, [50, 50, 50, 50, 50, 50]);
    await validate(a.userId, fran.playerId, [80, 80, 80, 80, 80, 80]);
    const row = await attrsOf(a.userId, g, fran.playerId);
    expect(row?.validators).toBe(1);
    expect(Number(row?.a1)).toBe(80);
    const [{ n }] = await t.sql<{ n: number }>("select count(*)::int as n from public.player_attribute_revisions where player_id = $1", [
      fran.playerId,
    ]);
    expect(n).toBe(2);
  });

  it("nadie se valida a sí mismo ni carga valores fuera de 1-99", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const a = await addMemberWithPlayer(t, g, "A");
    await expectDbError(validate(fran.userId, fran.playerId, [50, 50, 50, 50, 50, 50]), "cannot_rate_self");
    await expectDbError(validate(a.userId, fran.playerId, [50, 50, 50, 50, 50, 100]), "invalid_attributes");
    await expectDbError(validate(a.userId, fran.playerId, [50, 50, 50, 50, 50]), "invalid_attributes");
  });

  it("sin ficha vinculada no se autoevalúa ni valida; de otro grupo, no ve nada", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const sinFicha = await addMember(t, g, "SinFicha");
    await expectDbError(selfAssess(sinFicha, g, [50, 50, 50, 50, 50, 50]), "player_not_linked");
    await expectDbError(validate(sinFicha, fran.playerId, [50, 50, 50, 50, 50, 50]), "player_not_linked");

    const other = await createGroupWithAdmin(t, "Otro");
    await expectDbError(validate(other.adminId, fran.playerId, [50, 50, 50, 50, 50, 50]), "player_not_found");
    expect(await t.rpc(other.adminId, "get_group_attributes", { p_group_id: g.groupId })).toHaveLength(0);
  });

  it("los valores individuales son privados: cada uno ve solo lo suyo", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const a = await addMemberWithPlayer(t, g, "A");
    await selfAssess(fran.userId, g, [70, 70, 70, 70, 70, 70]);
    await validate(a.userId, fran.playerId, [60, 60, 60, 60, 60, 60]);
    expect(await t.queryAs(g.adminId, "select * from public.player_attribute_validations")).toHaveLength(0);
    expect(await t.queryAs(g.adminId, "select * from public.player_self_assessments")).toHaveLength(0);
    expect(await t.queryAs(fran.userId, "select * from public.player_attribute_validations")).toHaveLength(0);
    expect(await t.queryAs(a.userId, "select * from public.player_attribute_validations")).toHaveLength(1);
    await expectDbError(t.queryAs(a.userId, "select * from public.player_attribute_revisions"), "permission denied");
  });

  it("el formulario de validación arranca con mi validación anterior o con la autoevaluación", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const a = await addMemberWithPlayer(t, g, "A");
    const [none] = await t.rpc<{ source: string; scores: number[] | null }>(a.userId, "get_attribute_validation_form", {
      p_player_id: fran.playerId,
    });
    expect(none.source).toBe("none");
    await selfAssess(fran.userId, g, [71, 72, 73, 74, 75, 76]);
    const [self] = await t.rpc<{ source: string; scores: number[] }>(a.userId, "get_attribute_validation_form", { p_player_id: fran.playerId });
    expect(self.source).toBe("self");
    expect(self.scores).toEqual([71, 72, 73, 74, 75, 76]);
    await validate(a.userId, fran.playerId, [60, 61, 62, 63, 64, 65]);
    const [mine] = await t.rpc<{ source: string; scores: number[] }>(a.userId, "get_attribute_validation_form", { p_player_id: fran.playerId });
    expect(mine.source).toBe("mine");
    expect(mine.scores).toEqual([60, 61, 62, 63, 64, 65]);
  });

  it("un arquero tiene atributos propios: cambiar de posición no mezcla los valores", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    await selfAssess(fran.userId, g, [50, 50, 50, 50, 50, 50]);
    await t.sql("insert into public.player_positions (player_id, group_id, position, priority) values ($1, $2, 'goalkeeper', 1)", [
      fran.playerId,
      g.groupId,
    ]);
    expect(await attrsOf(g.adminId, g, fran.playerId)).toBeUndefined();
    const [kind] = await t.rpc<{ save_self_assessment: string }>(fran.userId, "save_self_assessment", {
      p_group_id: g.groupId,
      p_values: [80, 80, 80, 80, 80, 80],
    });
    expect(kind.save_self_assessment).toBe("goalkeeper");
    const row = await attrsOf(g.adminId, g, fran.playerId);
    expect(row?.kind).toBe("goalkeeper");
    expect(Number(row?.a1)).toBe(80);
  });
});
