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

interface Voter {
  userId: string;
  playerId: string;
}

interface VotingSetup {
  g: GroupFixture;
  matchId: string;
  /** voters[0] es el admin. Equipo A = 0..3, equipo B = 4..7. */
  voters: Voter[];
}

async function setupFinishedMatch(): Promise<VotingSetup> {
  const g = await createGroupWithAdmin(t);
  const voters: Voter[] = [{ userId: g.adminId, playerId: g.adminPlayerId }];
  for (const name of ["Manu", "Vece", "Paramo", "Tadeo", "Fran", "Boni", "Matías"]) {
    voters.push(await addMemberWithPlayer(t, g, name));
  }
  const ids = voters.map((v) => v.playerId);
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: new Date().toISOString(),
    p_players_per_team: 4,
    p_participants: ids.map((player_id) => ({ player_id })),
  });
  await t.rpc(g.adminId, "set_match_teams", { p_match_id: row.create_match, p_team_a: ids.slice(0, 4), p_team_b: ids.slice(4) });
  await t.rpc(g.adminId, "record_match_result", {
    p_match_id: row.create_match,
    p_score_a: 2,
    p_score_b: 1,
    p_events: [
      { event_type: "goal", player_id: ids[1] },
      { event_type: "goal", player_id: ids[1] },
      { event_type: "assist", player_id: ids[2] },
      { event_type: "goal", player_id: ids[5] },
    ],
  });
  return { g, matchId: row.create_match, voters };
}

function vote(s: VotingSetup, voter: Voter, ratings: Array<[Voter, number]>) {
  return t.rpc(voter.userId, "submit_match_ratings", {
    p_match_id: s.matchId,
    p_ratings: ratings.map(([rated, score]) => ({ player_id: rated.playerId, score })),
  });
}

async function closeVoting(s: VotingSetup) {
  await t.sql("update public.matches set voting_closes_at = now() - interval '1 minute' where id = $1", [s.matchId]);
}

describe("emitir votos", () => {
  let s: VotingSetup;

  beforeAll(async () => {
    s = await setupFinishedMatch();
  });

  it("un participante califica a compañeros y rivales", async () => {
    const [row] = await vote(s, s.voters[1], [
      [s.voters[0], 7],
      [s.voters[4], 6],
    ]);
    expect(row.submit_match_ratings).toBe(2);
  });

  it("volver a votar actualiza el voto en lugar de duplicarlo", async () => {
    await vote(s, s.voters[1], [[s.voters[0], 9]]);
    const own = await t.queryAs<{ score: number }>(
      s.voters[1].userId,
      "select score from public.match_ratings where match_id = $1 and rated_player_id = $2",
      [s.matchId, s.voters[0].playerId],
    );
    expect(own).toEqual([{ score: 9 }]);
  });

  it("nadie puede votarse a sí mismo", async () => {
    await expectDbError(vote(s, s.voters[2], [[s.voters[2], 10]]), "cannot_rate_self");
  });

  it("la calificación va de 1 a 10", async () => {
    await expectDbError(vote(s, s.voters[2], [[s.voters[3], 11]]), "invalid_score");
    await expectDbError(vote(s, s.voters[2], [[s.voters[3], 0]]), "invalid_score");
  });

  it("solo votan quienes jugaron", async () => {
    const spectator = await addMember(t, s.g, "Espectador");
    await expectDbError(
      t.rpc(spectator, "submit_match_ratings", {
        p_match_id: s.matchId,
        p_ratings: [{ player_id: s.voters[0].playerId, score: 8 }],
      }),
      "not_a_participant",
    );
  });

  it("solo se califica a quienes jugaron", async () => {
    const bench = await addMemberWithPlayer(t, s.g, "Suplente");
    await expectDbError(vote(s, s.voters[3], [[bench, 5]]), "rated_not_in_match");
  });

  it("no se puede escribir la tabla de votos directamente", async () => {
    await expectDbError(
      t.queryAs(
        s.voters[2].userId,
        `insert into public.match_ratings (match_id, group_id, rater_player_id, rater_profile_id, rated_player_id, score)
         values ($1, $2, $3, $4, $5, 10)`,
        [s.matchId, s.g.groupId, s.voters[2].playerId, s.voters[2].userId, s.voters[3].playerId],
      ),
      "permission denied",
    );
  });

  it("los no miembros no pueden votar", async () => {
    const stranger = await t.createUser("Extraño");
    await expectDbError(
      t.rpc(stranger, "submit_match_ratings", {
        p_match_id: s.matchId,
        p_ratings: [{ player_id: s.voters[0].playerId, score: 1 }],
      }),
      "match_not_found",
    );
  });
});

describe("anonimato", () => {
  let s: VotingSetup;

  beforeAll(async () => {
    s = await setupFinishedMatch();
    await vote(s, s.voters[1], [[s.voters[2], 8]]);
    await vote(s, s.voters[3], [[s.voters[2], 4]]);
  });

  it("cada uno ve solo sus propios votos", async () => {
    const seen = await t.queryAs(s.voters[1].userId, "select * from public.match_ratings where match_id = $1", [s.matchId]);
    expect(seen).toHaveLength(1);
  });

  it("el calificado no ve quién lo votó", async () => {
    const seen = await t.queryAs(s.voters[2].userId, "select * from public.match_ratings where match_id = $1", [s.matchId]);
    expect(seen).toHaveLength(0);
  });

  it("ni siquiera un admin ve votos ajenos", async () => {
    const seen = await t.queryAs(s.g.adminId, "select * from public.match_ratings where match_id = $1", [s.matchId]);
    expect(seen).toHaveLength(0);
  });

  it("los votos no se auditan", async () => {
    const logs = await t.sql("select * from public.audit_logs where entity_type = 'match_ratings'");
    expect(logs).toHaveLength(0);
  });

  it("los agregados no se publican mientras la votación está abierta", async () => {
    const rows = await t.rpc(s.voters[2].userId, "get_rating_aggregates", { p_group_id: s.g.groupId, p_match_id: s.matchId });
    expect(rows).toHaveLength(0);
  });

  it("el progreso informa solo cantidades", async () => {
    const [progress] = await t.rpc<{ eligible_voters: number; voters: number; is_open: boolean }>(
      s.voters[5].userId,
      "get_voting_progress",
      { p_match_id: s.matchId },
    );
    expect(progress).toMatchObject({ eligible_voters: 8, voters: 2, is_open: true });
  });
});

describe("cierre y agregados", () => {
  it("al cerrar, publica promedios y bloquea nuevos votos", async () => {
    const s = await setupFinishedMatch();
    const [admin, manu, vece, paramo] = s.voters;
    await vote(s, manu, [[admin, 8]]);
    await vote(s, vece, [[admin, 6]]);
    await closeVoting(s);

    await expectDbError(vote(s, paramo, [[admin, 10]]), "voting_closed");

    const rows = await t.rpc<{ player_id: string; votes: number; raw_average: string; adjusted_average: string }>(
      paramo.userId,
      "get_rating_aggregates",
      { p_group_id: s.g.groupId, p_match_id: s.matchId },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ player_id: admin.playerId, votes: 2 });
    expect(Number(rows[0].raw_average)).toBe(7);
  });

  it("con 5 o más votos descarta el máximo y el mínimo", async () => {
    const s = await setupFinishedMatch();
    const target = s.voters[0];
    const scores = [1, 7, 7, 7, 10];
    for (const [i, score] of scores.entries()) {
      await vote(s, s.voters[i + 1], [[target, score]]);
    }
    await closeVoting(s);
    const [row] = await t.rpc<{ votes: number; raw_average: string; adjusted_average: string }>(
      target.userId,
      "get_rating_aggregates",
      { p_group_id: s.g.groupId, p_match_id: s.matchId },
    );
    expect(row.votes).toBe(5);
    expect(Number(row.raw_average)).toBe(6.4);
    expect(Number(row.adjusted_average)).toBe(7);
  });

  it("corrige el sesgo de votantes generosos o severos", async () => {
    const s = await setupFinishedMatch();
    const [generous, b, x, , harsh, c, y] = s.voters;
    // El generoso pone 10 a todos y el severo 4 a todos: ninguno distingue
    // entre jugadores, así que b y c no deberían quedar separados por 6 puntos.
    await vote(s, generous, [
      [b, 10],
      [x, 10],
      [y, 10],
    ]);
    await vote(s, harsh, [
      [c, 4],
      [x, 4],
      [y, 4],
    ]);
    await closeVoting(s);
    const rows = await t.rpc<{ player_id: string; raw_average: string; adjusted_average: string }>(
      b.userId,
      "get_rating_aggregates",
      { p_group_id: s.g.groupId, p_match_id: s.matchId },
    );
    const byPlayer = Object.fromEntries(rows.map((r) => [r.player_id, r]));
    expect(Number(byPlayer[b.playerId].raw_average)).toBe(10);
    expect(Number(byPlayer[c.playerId].raw_average)).toBe(4);
    expect(Number(byPlayer[b.playerId].adjusted_average)).toBe(7);
    expect(Number(byPlayer[c.playerId].adjusted_average)).toBe(7);
  });

  it("un no miembro no recibe agregados", async () => {
    const s = await setupFinishedMatch();
    await vote(s, s.voters[1], [[s.voters[0], 8]]);
    await closeVoting(s);
    const stranger = await t.createUser("Fuera");
    const rows = await t.rpc(stranger, "get_rating_aggregates", { p_group_id: s.g.groupId });
    expect(rows).toHaveLength(0);
  });
});

describe("MVP por votos", () => {
  it("se asigna al mejor con al menos 3 votos al cerrar", async () => {
    const s = await setupFinishedMatch();
    const [admin, manu, vece, paramo, tadeo] = s.voters;
    for (const voter of [manu, vece, paramo, tadeo]) {
      await vote(s, voter, [[admin, 9]]);
    }
    await vote(s, admin, [
      [manu, 6],
      [vece, 6],
    ]);
    await vote(s, paramo, [[manu, 7]]);

    const [early] = await t.rpc<{ finalize_match_voting: string | null }>(manu.userId, "finalize_match_voting", {
      p_match_id: s.matchId,
    });
    expect(early.finalize_match_voting).toBeNull();

    await closeVoting(s);
    const [row] = await t.rpc<{ finalize_match_voting: string }>(manu.userId, "finalize_match_voting", { p_match_id: s.matchId });
    expect(row.finalize_match_voting).toBe(admin.playerId);

    const [match] = await t.sql<{ mvp_source: string }>("select mvp_source from public.matches where id = $1", [s.matchId]);
    expect(match.mvp_source).toBe("votes");
  });

  it("respeta el destacado elegido por un admin", async () => {
    const s = await setupFinishedMatch();
    const [admin, manu, vece, paramo, tadeo] = s.voters;
    await t.rpc(admin.userId, "record_match_result", {
      p_match_id: s.matchId,
      p_score_a: 2,
      p_score_b: 1,
      p_mvp_player_id: tadeo.playerId,
    });
    for (const voter of [manu, vece, paramo]) {
      await vote(s, voter, [[admin, 10]]);
    }
    await closeVoting(s);
    const [row] = await t.rpc<{ finalize_match_voting: string }>(manu.userId, "finalize_match_voting", { p_match_id: s.matchId });
    expect(row.finalize_match_voting).toBe(tadeo.playerId);
  });
});

describe("estadísticas", () => {
  it("get_player_stats suma partidos, resultados, goles, asistencias y MVP", async () => {
    const s = await setupFinishedMatch();
    const ids = s.voters.map((v) => v.playerId);

    // Segundo partido: empate 0-0 con los mismos equipos.
    const [row] = await t.rpc<{ create_match: string }>(s.g.adminId, "create_match", {
      p_group_id: s.g.groupId,
      p_scheduled_at: new Date().toISOString(),
      p_players_per_team: 4,
      p_participants: ids.map((player_id) => ({ player_id })),
    });
    await t.rpc(s.g.adminId, "set_match_teams", { p_match_id: row.create_match, p_team_a: ids.slice(0, 4), p_team_b: ids.slice(4) });
    await t.rpc(s.g.adminId, "record_match_result", {
      p_match_id: row.create_match,
      p_score_a: 0,
      p_score_b: 0,
      p_mvp_player_id: ids[1],
    });

    const stats = await t.rpc<{
      player_id: string;
      matches: number;
      wins: number;
      draws: number;
      losses: number;
      goals: number;
      assists: number;
      mvps: number;
    }>(s.g.adminId, "get_player_stats", { p_group_id: s.g.groupId });

    const manu = stats.find((r) => r.player_id === ids[1]);
    expect(manu).toMatchObject({ matches: 2, wins: 1, draws: 1, losses: 0, goals: 2, assists: 0, mvps: 1 });
    const boni = stats.find((r) => r.player_id === ids[5]);
    expect(boni).toMatchObject({ matches: 2, wins: 0, draws: 1, losses: 1, goals: 1 });
  });

  it("filtra por rango de fechas (temporada)", async () => {
    const s = await setupFinishedMatch();
    const stats = await t.rpc(s.g.adminId, "get_player_stats", {
      p_group_id: s.g.groupId,
      p_from: "2000-01-01",
      p_to: "2000-12-31",
    });
    expect(stats).toHaveLength(0);
  });

  it("un no miembro no ve estadísticas", async () => {
    const s = await setupFinishedMatch();
    const stranger = await t.createUser("Fuera");
    expect(await t.rpc(stranger, "get_player_stats", { p_group_id: s.g.groupId })).toHaveLength(0);
    expect(await t.queryAs(stranger, "select * from public.player_match_lines where group_id = $1", [s.g.groupId])).toHaveLength(0);
  });
});
