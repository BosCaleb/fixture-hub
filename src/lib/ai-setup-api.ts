import { supabase } from './supabase';
import type { AISetupResponse } from './ai-setup-types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tournament-setup`;

export async function callAISetup(params: {
  user_prompt: string;
  structured_hints?: Record<string, string>;
  follow_up_answers?: Record<string, string>;
}): Promise<AISetupResponse> {
  const resp = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `AI service error (${resp.status})`);
  }

  return resp.json();
}

/**
 * Maps AI normalized_config to TournamentSettings-compatible object for saving
 */
export function mapAIConfigToTournament(
  config: Record<string, unknown>,
  fields: Record<string, { value: unknown; source: string }>
): Record<string, unknown> {
  const get = (key: string) => config[key] ?? fields[key]?.value ?? null;

  const formatMap: Record<string, string> = {
    'pool stage + playoffs': 'pool_playoffs',
    'pool_stage_playoffs': 'pool_playoffs',
    'round robin': 'round_robin',
    'round_robin': 'round_robin',
    'knockout': 'knockout',
    'league': 'league',
    'swiss': 'swiss',
  };

  const rawFormat = String(get('format_type') || '').toLowerCase();
  const tournament_format = formatMap[rawFormat] || rawFormat || null;

  return {
    name: get('tournament_name') || 'Untitled Tournament',
    sport_type: get('sport') || 'netball',
    tournament_format,
    season: get('season_year') || null,
    description: get('description') || null,
    status: 'draft',
    start_date: get('start_date') || null,
    end_date: get('end_date') || null,
    daily_start_time: get('daily_start_time') || null,
    daily_end_time: get('daily_end_time') || null,
    timezone: get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
    match_duration: get('match_duration_minutes') || null,
    halftime_structure: get('halves_or_quarters') || null,
    break_time: get('break_between_matches_minutes') || null,
    venue_name: get('venue_name') || null,
    venue_address: get('venue_address') || null,
    num_courts: get('court_count') || null,
    court_names: Array.isArray(get('court_names')) ? get('court_names') : [],
    num_pools: get('number_of_pools') || null,
    max_teams: get('number_of_teams') || null,
    teams_per_pool: get('teams_per_pool') || null,
    points_for_win: get('points_for_win') ?? 3,
    points_for_draw: get('points_for_draw') ?? 1,
    points_for_loss: get('points_for_loss') ?? 0,
    tiebreak_rules: Array.isArray(get('standings_tiebreak_order')) ? get('standings_tiebreak_order') : [],
    playoff_qualification: get('playoff_format_description') || get('wildcard_rules') || null,
    draws_allowed_pools: get('allow_draws_in_pool_stage') ?? true,
    draws_allowed_playoffs: get('allow_draws_in_knockout') ?? false,
    age_group: get('age_group') || null,
    gender_category: get('gender_division') || null,
    host_org: get('host_org') || null,
    contact_person: get('contact_person') || null,
    medical_contact: get('medical_contact') || null,
    registration_open: get('registration_open') ?? false,
    registration_deadline: get('registration_deadline') || null,
    entry_fee: get('entry_fee') || null,
    max_teams_registration: get('max_teams_registration') || null,
    manager_name: 'Tournament Manager',
    is_public: true,
    setup_source: 'ai-assisted',
  };
}
