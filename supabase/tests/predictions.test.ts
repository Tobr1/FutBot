import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, addPlayer, createGroupWithAdmin, type GroupFixture } from "./helpers/fixtures";
import { createTestDb, expectDbError, type TestDb } from "./helpers/test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t?.close();
});

const IN_TWO_DAYS = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

async function setup(withTeams = true) {
  const g = await createGroupWithAdmin(t);
  const ids = [g.adminPlayerId];
  for (const name of ["Manu", "Vece", "Paramo", "Tadeo", "Fran"]) ids.push(await addPlayer(t, g, name));
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: IN_TWO_DAYS(),
    p_players_per_team: 3,
    p_participants: ids.map((player_id) => ({ player_id })),
  });
  if (withTeams) {
    await t.rpc(g.adminId, "set_match_teams", { p_match_id: row.create_match, p_team_a: ids.slice(0, 3), p_team_b: ids.slice(3) });
  }
  return { g, matchId: row.create_match };
}

const predict = (userId: string, matchId: string, a: number, b: number) =>
  t.rpc(userId, "save_match_prediction", { p_match_id: matchId, p_score_a: a, p_score_b: b });

async function startMatch(matchId: string) {
  await t.sql("update public.matches set scheduled_at = now() - interval '1 minute' where id = $1", [matchId]);
}

describe("pronósticos", () => {
  it("un pronóstico por cuenta: volver a pronosticar lo cambia", async () => {
    const { g, matchId } = await setup();
    const fan = await addMember(t, g, "Hincha");
    await predict(fan, matchId, 2, 1);
    await predict(fan, matchId, 3, 3);
    const rows = await t.queryAs<{ score_a: number; score_b: number }>(fan, "select score_a, score_b from public.match_predictions");
    expect(rows).toEqual([{ score_a: 3, score_b: 3 }]);
  });

  it("antes del inicio cada uno ve solo el suyo; desde el inicio, todos", async () => {
    const { g, matchId } = await setup();
    const a = await addMember(t, g, "A");
    const b = await addMember(t, g, "B");
    await predict(a, matchId, 1, 0);
    await predict(b, matchId, 0, 2);
    expect(await t.queryAs(a, "select * from public.match_predictions where match_id = $1", [matchId])).toHaveLength(1);
    expect(await t.queryAs(g.adminId, "select * from public.match_predictions where match_id = $1", [matchId])).toHaveLength(0);
    const [count] = await t.rpc<{ get_prediction_count: number }>(g.adminId, "get_prediction_count", { p_match_id: matchId });
    expect(count.get_prediction_count).toBe(2);

    await startMatch(matchId);
    expect(await t.queryAs(a, "select * from public.match_predictions where match_id = $1", [matchId])).toHaveLength(2);
  });

  it("no se pronostica después del inicio ni sin los dos equipos armados", async () => {
    const started = await setup();
    const fan = await addMember(t, started.g, "Tarde");
    await startMatch(started.matchId);
    await expectDbError(predict(fan, started.matchId, 1, 1), "predictions_closed");

    const noTeams = await setup(false);
    await expectDbError(predict(noTeams.g.adminId, noTeams.matchId, 1, 1), "teams_not_ready");
  });

  it("solo miembros del grupo y con goles de 0 a 30", async () => {
    const { matchId } = await setup();
    const other: GroupFixture = await createGroupWithAdmin(t, "Otro");
    await expectDbError(predict(other.adminId, matchId, 1, 0), "match_not_found");
    const mine = await setup();
    await expectDbError(predict(mine.g.adminId, mine.matchId, -1, 0), "invalid_prediction");
    await expectDbError(predict(mine.g.adminId, mine.matchId, 31, 0), "invalid_prediction");
  });

  it("no se escribe directo en la tabla", async () => {
    const { g, matchId } = await setup();
    await expectDbError(
      t.queryAs(g.adminId, "insert into public.match_predictions (match_id, group_id, profile_id, score_a, score_b) values ($1, $2, $3, 1, 1)", [
        matchId,
        g.groupId,
        g.adminId,
      ]),
      "permission denied",
    );
  });
});
