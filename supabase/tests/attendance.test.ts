import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, addMemberWithPlayer, addPlayer, createGroupWithAdmin, type GroupFixture } from "./helpers/fixtures";
import { createTestDb, expectDbError, type TestDb } from "./helpers/test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t?.close();
});

const IN_TWO_DAYS = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

/** Partido de 3 por lado (cupo 6) con `prefilled` fichas sin cuenta ya convocadas. */
async function setup(prefilled: number) {
  const g = await createGroupWithAdmin(t);
  const fillers: string[] = [];
  for (let i = 0; i < prefilled; i++) fillers.push(await addPlayer(t, g, `Relleno ${i + 1}`));
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: IN_TWO_DAYS(),
    p_players_per_team: 3,
    p_participants: fillers.map((player_id) => ({ player_id })),
  });
  return { g, matchId: row.create_match, fillers };
}

async function statusOf(matchId: string, playerId: string) {
  const [row] = await t.sql<{ status: string }>(
    "select status from public.match_participants where match_id = $1 and player_id = $2",
    [matchId, playerId],
  );
  return row?.status ?? null;
}

async function attend(userId: string, matchId: string, going: boolean) {
  const [row] = await t.rpc<{ set_my_attendance: string }>(userId, "set_my_attendance", { p_match_id: matchId, p_going: going });
  return row.set_my_attendance;
}

describe("Voy / No voy", () => {
  it("con lugar, el jugador queda titular", async () => {
    const { g, matchId } = await setup(2);
    const { userId, playerId } = await addMemberWithPlayer(t, g, "Juanchi");
    expect(await attend(userId, matchId, true)).toBe("confirmed");
    expect(await statusOf(matchId, playerId)).toBe("confirmed");
  });

  it("con el cupo lleno, queda suplente; si un titular se baja, sube el primer suplente", async () => {
    const { g, matchId } = await setup(5);
    const first = await addMemberWithPlayer(t, g, "Primero");
    const second = await addMemberWithPlayer(t, g, "Segundo");
    const third = await addMemberWithPlayer(t, g, "Tercero");
    expect(await attend(first.userId, matchId, true)).toBe("confirmed");
    expect(await attend(second.userId, matchId, true)).toBe("reserve");
    expect(await attend(third.userId, matchId, true)).toBe("reserve");

    expect(await attend(first.userId, matchId, false)).toBe("dropped");
    expect(await statusOf(matchId, first.playerId)).toBe("dropped");
    expect(await statusOf(matchId, second.playerId)).toBe("confirmed");
    expect(await statusOf(matchId, third.playerId)).toBe("reserve");
  });

  it("confirmar dos veces no cambia el lugar y avisar que no va queda registrado", async () => {
    const { g, matchId } = await setup(0);
    const { userId, playerId } = await addMemberWithPlayer(t, g, "Doble");
    await attend(userId, matchId, true);
    expect(await attend(userId, matchId, true)).toBe("confirmed");
    const [{ n }] = await t.sql<{ n: number }>("select count(*)::int as n from public.match_participants where match_id = $1", [matchId]);
    expect(n).toBe(1);

    const other = await addMemberWithPlayer(t, g, "NoVa");
    expect(await attend(other.userId, matchId, false)).toBe("dropped");
    expect(await statusOf(matchId, other.playerId)).toBe("dropped");
    expect(await statusOf(matchId, playerId)).toBe("confirmed");
  });

  it("al bajarse sale de los equipos ya armados", async () => {
    const { g, matchId, fillers } = await setup(5);
    const { userId, playerId } = await addMemberWithPlayer(t, g, "Armado");
    await attend(userId, matchId, true);
    await t.rpc(g.adminId, "set_match_teams", {
      p_match_id: matchId,
      p_team_a: [fillers[0], fillers[1], fillers[2]],
      p_team_b: [fillers[3], fillers[4], playerId],
    });
    await attend(userId, matchId, false);
    const members = await t.sql("select 1 from public.team_members where match_id = $1 and player_id = $2", [matchId, playerId]);
    expect(members).toHaveLength(0);
  });

  it("sin ficha vinculada no se puede confirmar", async () => {
    const { g, matchId } = await setup(0);
    const member = await addMember(t, g, "SinFicha");
    await expectDbError(attend(member, matchId, true), "player_not_linked");
  });

  it("alguien de otro grupo no ve el partido", async () => {
    const { matchId } = await setup(0);
    const other: GroupFixture = await createGroupWithAdmin(t, "Otro grupo");
    await expectDbError(attend(other.adminId, matchId, true), "match_not_found");
  });

  it("un partido que ya empezó, cancelado o jugado no acepta confirmaciones", async () => {
    const { g, matchId } = await setup(0);
    const { userId } = await addMemberWithPlayer(t, g, "Tarde");
    await t.sql("update public.matches set scheduled_at = now() - interval '1 hour' where id = $1", [matchId]);
    await expectDbError(attend(userId, matchId, true), "attendance_closed");

    const next = await setup(0);
    const late = await addMemberWithPlayer(t, next.g, "Cancelado");
    await t.queryAs(next.g.adminId, "update public.matches set status = 'cancelled' where id = $1", [next.matchId]);
    await expectDbError(attend(late.userId, next.matchId, true), "attendance_closed");
  });

  it("la convocatoria del admin conserva a quienes avisaron que no van", async () => {
    const { g, matchId, fillers } = await setup(2);
    const { userId, playerId } = await addMemberWithPlayer(t, g, "Avisó");
    await attend(userId, matchId, false);
    await t.rpc(g.adminId, "set_match_participants", {
      p_match_id: matchId,
      p_participants: fillers.map((player_id) => ({ player_id })),
    });
    expect(await statusOf(matchId, playerId)).toBe("dropped");
  });
});
