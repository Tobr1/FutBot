import "server-only";
import { type PredictionRow, predictionStandings, type PredictorStanding, type Score } from "@/domain/predictions/member";
import { createClient } from "@/lib/supabase/server";

export interface PredictionEntry {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  prediction: Score;
}

export interface MatchPredictions {
  mine: Score | null;
  /** Cuántos pronosticaron (sin revelar quiénes antes del inicio). */
  count: number;
  /** Todos los pronósticos: solo desde que empieza el partido (RLS). */
  entries: PredictionEntry[];
}

async function profilesById(ids: string[]) {
  if (ids.length === 0) return new Map<string, { name: string; avatarUrl: string | null }>();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, { name: p.display_name ?? "Sin nombre", avatarUrl: p.avatar_url }]));
}

/** Pronósticos de un partido para la cuenta actual. `locked`: ya empezó. */
export async function getMatchPredictions(matchId: string, userId: string, locked: boolean): Promise<MatchPredictions> {
  const supabase = await createClient();
  const [rows, count] = await Promise.all([
    supabase.from("match_predictions").select("profile_id, score_a, score_b").eq("match_id", matchId),
    supabase.rpc("get_prediction_count", { p_match_id: matchId }),
  ]);
  if (rows.error) throw rows.error;
  if (count.error) throw count.error;
  const mineRow = rows.data.find((r) => r.profile_id === userId);
  const visible = locked ? rows.data : [];
  const names = await profilesById(visible.map((r) => r.profile_id));
  return {
    mine: mineRow ? { a: mineRow.score_a, b: mineRow.score_b } : null,
    count: count.data ?? 0,
    entries: visible
      .map((r) => ({
        profileId: r.profile_id,
        name: names.get(r.profile_id)?.name ?? "Sin nombre",
        avatarUrl: names.get(r.profile_id)?.avatarUrl ?? null,
        prediction: { a: r.score_a, b: r.score_b },
      }))
      .sort((x, y) => x.name.localeCompare(y.name, "es-AR")),
  };
}

export interface StandingRow extends PredictorStanding {
  name: string;
  avatarUrl: string | null;
}

/** Tabla de pronosticadores del grupo (partidos jugados). */
export async function getPredictionStandings(groupId: string): Promise<StandingRow[]> {
  const supabase = await createClient();
  const [predictions, finished] = await Promise.all([
    supabase.from("match_predictions").select("profile_id, match_id, score_a, score_b").eq("group_id", groupId).limit(5000),
    supabase.from("matches").select("id, teams!teams_match_fkey(side, score)").eq("group_id", groupId).eq("status", "finished").limit(1000),
  ]);
  if (predictions.error) throw predictions.error;
  if (finished.error) throw finished.error;

  const results = new Map<string, Score>();
  for (const m of finished.data) {
    const a = m.teams.find((t) => t.side === "a")?.score;
    const b = m.teams.find((t) => t.side === "b")?.score;
    if (a != null && b != null) results.set(m.id, { a, b });
  }
  const rows: PredictionRow[] = predictions.data.map((r) => ({
    profileId: r.profile_id,
    matchId: r.match_id,
    prediction: { a: r.score_a, b: r.score_b },
    result: results.get(r.match_id) ?? null,
  }));
  const standings = predictionStandings(rows);
  const names = await profilesById(standings.map((s) => s.profileId));
  return standings.map((s) => ({ ...s, name: names.get(s.profileId)?.name ?? "Sin nombre", avatarUrl: names.get(s.profileId)?.avatarUrl ?? null }));
}
