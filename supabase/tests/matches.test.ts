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

interface MatchSetup {
  g: GroupFixture;
  players: string[];
  matchId: string;
  teamA: string[];
  teamB: string[];
}

async function setupMatch(withTeams = true): Promise<MatchSetup> {
  const g = await createGroupWithAdmin(t);
  const players = [g.adminPlayerId];
  for (const name of ["Manu", "Vece", "Paramo", "Tadeo", "Fran", "Boni", "Matías"]) {
    players.push(await addPlayer(t, g, name));
  }
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: new Date().toISOString(),
    p_players_per_team: 4,
    p_venue: "La Canchita",
    p_participants: players.map((player_id) => ({ player_id })),
  });
  const teamA = players.slice(0, 4);
  const teamB = players.slice(4, 8);
  if (withTeams) {
    await t.rpc(g.adminId, "set_match_teams", { p_match_id: row.create_match, p_team_a: teamA, p_team_b: teamB });
  }
  return { g, players, matchId: row.create_match, teamA, teamB };
}

describe("crear partido", () => {
  it("crea el partido con convocatoria ordenada y dos equipos", async () => {
    const { matchId, players } = await setupMatch(false);
    const participants = await t.sql<{ player_id: string; sort_order: number }>(
      "select player_id, sort_order from public.match_participants where match_id = $1 order by sort_order",
      [matchId],
    );
    expect(participants.map((p) => p.player_id)).toEqual(players);
    const teams = await t.sql<{ side: string; name: string }>(
      "select side, name from public.teams where match_id = $1 order by side",
      [matchId],
    );
    expect(teams).toEqual([
      { side: "a", name: "Azul" },
      { side: "b", name: "Rojo" },
    ]);
  });

  it("solo un admin puede crear partidos", async () => {
    const g = await createGroupWithAdmin(t);
    const member = await addMember(t, g, "Jugador");
    await expectDbError(
      t.rpc(member, "create_match", {
        p_group_id: g.groupId,
        p_scheduled_at: new Date().toISOString(),
        p_players_per_team: 5,
      }),
      "forbidden",
    );
  });

  it("no acepta jugadores de otro grupo ni duplicados", async () => {
    const g = await createGroupWithAdmin(t);
    const other = await createGroupWithAdmin(t);
    const foreign = await addPlayer(t, other, "Ajeno");
    await expectDbError(
      t.rpc(g.adminId, "create_match", {
        p_group_id: g.groupId,
        p_scheduled_at: new Date().toISOString(),
        p_players_per_team: 5,
        p_participants: [{ player_id: foreign }],
      }),
      "player_not_found",
    );
    await expectDbError(
      t.rpc(g.adminId, "create_match", {
        p_group_id: g.groupId,
        p_scheduled_at: new Date().toISOString(),
        p_players_per_team: 5,
        p_participants: [{ player_id: g.adminPlayerId }, { player_id: g.adminPlayerId }],
      }),
      "duplicate_participant",
    );
  });

  it("pasar a suplente saca al jugador de su equipo", async () => {
    const { g, matchId, players } = await setupMatch();
    await t.rpc(g.adminId, "set_match_participants", {
      p_match_id: matchId,
      p_participants: players.map((player_id, i) => ({ player_id, status: i === 0 ? "reserve" : "confirmed" })),
    });
    const members = await t.sql("select * from public.team_members where match_id = $1 and player_id = $2", [matchId, players[0]]);
    expect(members).toHaveLength(0);
  });
});

describe("equipos", () => {
  it("un jugador no puede estar en ambos equipos", async () => {
    const { g, matchId, players } = await setupMatch(false);
    await expectDbError(
      t.rpc(g.adminId, "set_match_teams", {
        p_match_id: matchId,
        p_team_a: players.slice(0, 4),
        p_team_b: players.slice(3, 8),
      }),
      "player_in_both_teams",
    );
  });

  it("solo convocados confirmados pueden integrar equipos", async () => {
    const { g, matchId, players } = await setupMatch(false);
    const outsider = await addPlayer(t, g, "No convocado");
    await expectDbError(
      t.rpc(g.adminId, "set_match_teams", {
        p_match_id: matchId,
        p_team_a: [...players.slice(0, 4), outsider],
        p_team_b: players.slice(4, 8),
      }),
      "player_not_in_match",
    );
  });

  it("guardar de nuevo mueve jugadores sin duplicarlos", async () => {
    const { g, matchId, teamA, teamB } = await setupMatch();
    await t.rpc(g.adminId, "set_match_teams", {
      p_match_id: matchId,
      p_team_a: [...teamA.slice(1), teamB[0]],
      p_team_b: [teamA[0], ...teamB.slice(1)],
      p_name_a: "Los de blanco",
    });
    const rows = await t.sql<{ side: string; count: number }>(
      `select t.side, count(*)::int as count from public.team_members tm
       join public.teams t on t.id = tm.team_id where tm.match_id = $1 group by t.side order by t.side`,
      [matchId],
    );
    expect(rows).toEqual([
      { side: "a", count: 4 },
      { side: "b", count: 4 },
    ]);
    const [team] = await t.sql<{ name: string }>("select name from public.teams where match_id = $1 and side = 'a'", [matchId]);
    expect(team.name).toBe("Los de blanco");
  });

  it("los jugadores no escriben equipos directamente", async () => {
    const { g, matchId } = await setupMatch();
    const member = await addMember(t, g, "Tramposo");
    await expectDbError(
      t.queryAs(member, "delete from public.team_members where match_id = $1", [matchId]),
      "permission denied",
    );
  });
});

describe("resultado", () => {
  it("registra marcador, goles, asistencias y gol en contra", async () => {
    const { g, matchId, teamA, teamB } = await setupMatch();
    await t.rpc(g.adminId, "record_match_result", {
      p_match_id: matchId,
      p_score_a: 3,
      p_score_b: 1,
      p_events: [
        { event_type: "goal", player_id: teamA[0] },
        { event_type: "goal", player_id: teamA[0] },
        { event_type: "assist", player_id: teamA[1] },
        { event_type: "own_goal", player_id: teamB[2] },
        { event_type: "goal", player_id: teamB[0] },
      ],
    });

    const [match] = await t.sql<{ status: string; finished_at: string; voting_closes_at: string }>(
      "select status, finished_at, voting_closes_at from public.matches where id = $1",
      [matchId],
    );
    expect(match.status).toBe("finished");
    expect(match.voting_closes_at).not.toBeNull();

    const [ownGoal] = await t.sql<{ side: string }>(
      `select t.side from public.match_events e join public.teams t on t.id = e.team_id
       where e.match_id = $1 and e.event_type = 'own_goal'`,
      [matchId],
    );
    expect(ownGoal.side).toBe("a");

    const lines = await t.queryAs<{ player_id: string; result: string; goals: number; assists: number }>(
      g.adminId,
      "select player_id, result, goals, assists from public.player_match_lines where match_id = $1",
      [matchId],
    );
    const scorer = lines.find((l) => l.player_id === teamA[0]);
    expect(scorer).toMatchObject({ result: "win", goals: 2, assists: 0 });
    expect(lines.find((l) => l.player_id === teamB[0])).toMatchObject({ result: "loss", goals: 1 });
  });

  it("rechaza más goles con autor que el marcador", async () => {
    const { g, matchId, teamA } = await setupMatch();
    await expectDbError(
      t.rpc(g.adminId, "record_match_result", {
        p_match_id: matchId,
        p_score_a: 1,
        p_score_b: 0,
        p_events: [
          { event_type: "goal", player_id: teamA[0] },
          { event_type: "goal", player_id: teamA[1] },
        ],
      }),
      "goals_exceed_score",
    );
    const [match] = await t.sql<{ status: string }>("select status from public.matches where id = $1", [matchId]);
    expect(match.status).toBe("scheduled");
  });

  it("rechaza más asistencias que goles", async () => {
    const { g, matchId, teamA } = await setupMatch();
    await expectDbError(
      t.rpc(g.adminId, "record_match_result", {
        p_match_id: matchId,
        p_score_a: 1,
        p_score_b: 0,
        p_events: [
          { event_type: "goal", player_id: teamA[0] },
          { event_type: "assist", player_id: teamA[1] },
          { event_type: "assist", player_id: teamA[2] },
        ],
      }),
      "assists_exceed_goals",
    );
  });

  it("rechaza eventos de jugadores que no jugaron", async () => {
    const { g, matchId } = await setupMatch();
    const outsider = await addPlayer(t, g, "Afuera");
    await expectDbError(
      t.rpc(g.adminId, "record_match_result", {
        p_match_id: matchId,
        p_score_a: 1,
        p_score_b: 0,
        p_events: [{ event_type: "goal", player_id: outsider }],
      }),
      "player_not_in_match",
    );
  });

  it("exige equipos armados", async () => {
    const { g, matchId } = await setupMatch(false);
    await expectDbError(
      t.rpc(g.adminId, "record_match_result", { p_match_id: matchId, p_score_a: 0, p_score_b: 0 }),
      "teams_not_set",
    );
  });

  it("una corrección queda auditada con el antes y el después", async () => {
    const { g, matchId, teamA } = await setupMatch();
    await t.rpc(g.adminId, "record_match_result", { p_match_id: matchId, p_score_a: 1, p_score_b: 0 });
    await t.rpc(g.adminId, "record_match_result", {
      p_match_id: matchId,
      p_score_a: 2,
      p_score_b: 0,
      p_events: [{ event_type: "goal", player_id: teamA[0] }],
    });
    const logs = await t.queryAs<{ action: string; old_data: { score_a: number }; new_data: { score_a: number } }>(
      g.adminId,
      "select action, old_data, new_data from public.audit_logs where entity_id = $1 and action like 'result_%' order by id",
      [matchId],
    );
    expect(logs.map((l) => l.action)).toEqual(["result_recorded", "result_corrected"]);
    expect(logs[1].old_data.score_a).toBe(1);
    expect(logs[1].new_data.score_a).toBe(2);
  });

  it("un jugador no puede registrar resultados", async () => {
    const { g, matchId } = await setupMatch();
    const member = await addMember(t, g, "Jugador");
    await expectDbError(
      t.rpc(member, "record_match_result", { p_match_id: matchId, p_score_a: 9, p_score_b: 0 }),
      "match_not_found",
    );
  });

  it("no se puede finalizar ni reabrir un partido editándolo directamente", async () => {
    const { g, matchId } = await setupMatch();
    await expectDbError(
      t.queryAs(g.adminId, "update public.matches set status = 'finished' where id = $1", [matchId]),
      "use_record_result",
    );
    await t.rpc(g.adminId, "record_match_result", { p_match_id: matchId, p_score_a: 0, p_score_b: 0 });
    await expectDbError(
      t.queryAs(g.adminId, "update public.matches set status = 'scheduled' where id = $1", [matchId]),
      "match_locked",
    );
  });

  it("un partido finalizado no se puede borrar y sus jugadores tampoco", async () => {
    const { g, matchId, teamA } = await setupMatch();
    await t.rpc(g.adminId, "record_match_result", { p_match_id: matchId, p_score_a: 0, p_score_b: 0 });
    const deleted = await t.queryAs(g.adminId, "delete from public.matches where id = $1 returning id", [matchId]);
    expect(deleted).toHaveLength(0);
    await expectDbError(
      t.queryAs(g.adminId, "delete from public.players where id = $1", [teamA[1]]),
      "match_participants_player_fkey",
    );
  });

  it("corregir equipos de un partido finalizado descarta eventos incoherentes", async () => {
    const { g, matchId, teamA, teamB } = await setupMatch();
    await t.rpc(g.adminId, "record_match_result", {
      p_match_id: matchId,
      p_score_a: 1,
      p_score_b: 0,
      p_events: [{ event_type: "goal", player_id: teamA[0] }],
    });
    await t.rpc(g.adminId, "set_match_teams", {
      p_match_id: matchId,
      p_team_a: teamA.slice(1),
      p_team_b: [...teamB, teamA[0]],
    });
    const events = await t.sql("select * from public.match_events where match_id = $1", [matchId]);
    expect(events).toHaveLength(0);
  });
});
