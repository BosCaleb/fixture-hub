/**
 * Analytics query layer — reads from the analytics schema.
 * All functions return null on failure so callers can fall back to operational logic.
 */
import { supabase } from '@/lib/supabase';
import type {
  AnalyticsPoolStanding,
  AnalyticsTournamentSummary,
  AnalyticsUnifiedMatch,
  AnalyticsTeamPerformance,
} from '@/lib/types/analytics';

/**
 * Fetch pool standings from the analytics materialized view.
 * Falls back to null if the analytics schema is inaccessible.
 */
export async function fetchAnalyticsStandings(
  tournamentId: string
): Promise<AnalyticsPoolStanding[] | null> {
  try {
    const { data, error } = await supabase
      .from('mv_pool_standings_current')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('pool_name')
      .order('pool_rank');

    if (error) {
      console.warn('[analytics] standings unavailable, falling back:', error.message);
      return null;
    }
    return data as AnalyticsPoolStanding[];
  } catch {
    return null;
  }
}

/**
 * Fetch tournament summary from the analytics materialized view.
 */
export async function fetchAnalyticsTournamentSummary(
  tournamentId: string
): Promise<AnalyticsTournamentSummary | null> {
  try {
    const { data, error } = await supabase
      .from('mv_tournament_summary')
      .select('*')
      .eq('tournament_id', tournamentId)
      .maybeSingle();

    if (error) {
      console.warn('[analytics] tournament summary unavailable:', error.message);
      return null;
    }
    return data as AnalyticsTournamentSummary | null;
  } catch {
    return null;
  }
}

/**
 * Fetch unified match schedule (pool + playoff) from the analytics view.
 */
export async function fetchAnalyticsUnifiedSchedule(
  tournamentId: string
): Promise<AnalyticsUnifiedMatch[] | null> {
  try {
    const { data, error } = await supabase
      .from('v_match_schedule_unified')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('match_stage')
      .order('round')
      .order('position');

    if (error) {
      console.warn('[analytics] unified schedule unavailable:', error.message);
      return null;
    }
    return data as AnalyticsUnifiedMatch[];
  } catch {
    return null;
  }
}

/**
 * Fetch team performance across all matches from the analytics materialized view.
 */
export async function fetchAnalyticsTeamPerformance(
  tournamentId: string
): Promise<AnalyticsTeamPerformance[] | null> {
  try {
    const { data, error } = await supabase
      .from('mv_team_performance_all_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('total_points', { ascending: false });

    if (error) {
      console.warn('[analytics] team performance unavailable:', error.message);
      return null;
    }
    return data as AnalyticsTeamPerformance[];
  } catch {
    return null;
  }
}
