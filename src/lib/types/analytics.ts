/**
 * Analytics layer types — mirrors the analytics schema in Supabase.
 * These are read-only reporting types, NOT used for writes.
 */

/** analytics.mv_pool_standings_current */
export interface AnalyticsPoolStanding {
  tournament_id: string;
  pool_id: string;
  pool_name: string;
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  pool_rank: number;
}

/** analytics.mv_tournament_summary */
export interface AnalyticsTournamentSummary {
  tournament_id: string;
  tournament_name: string;
  sport_type: string | null;
  tournament_format: string | null;
  venue_name: string | null;
  owner_email: string | null;
  total_teams: number;
  total_pools: number;
  total_players: number;
  pool_fixtures_total: number;
  pool_fixtures_played: number;
  pool_fixtures_remaining: number;
  playoff_matches_total: number;
  playoff_matches_played: number;
  playoff_matches_remaining: number;
  tournament_status: string | null;
  created_at: string;
}

/** analytics.v_match_schedule_unified */
export interface AnalyticsUnifiedMatch {
  match_id: string;
  tournament_id: string;
  match_stage: 'pool' | 'playoff';
  pool_id: string | null;
  pool_name: string | null;
  round: number;
  position: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  match_date: string | null;
  match_time: string | null;
  venue: string | null;
}

/** analytics.mv_team_performance_all_matches */
export interface AnalyticsTeamPerformance {
  tournament_id: string;
  team_id: string;
  team_name: string;
  total_matches: number;
  total_wins: number;
  total_draws: number;
  total_losses: number;
  total_goals_for: number;
  total_goals_against: number;
  total_goal_difference: number;
  total_points: number;
}
