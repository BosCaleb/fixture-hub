/** Types for the AI Tournament Setup Assistant */

export type FieldSource = 'user' | 'ai' | 'default' | 'needs_confirmation';

export interface ExtractedField {
  value: unknown;
  source: FieldSource;
  confidence: number;
}

export interface ConflictingField {
  field: string;
  issue: string;
}

export interface FollowUpQuestion {
  id: string;
  field: string;
  question: string;
}

export interface AISetupResponse {
  summary: string;
  fields: Record<string, ExtractedField>;
  missing_required_fields: string[];
  conflicting_fields: ConflictingField[];
  follow_up_questions: FollowUpQuestion[];
  assumptions: string[];
  warnings: string[];
  normalized_config: Record<string, unknown>;
  _meta?: {
    model: string;
    duration_ms: number;
  };
  error?: string;
}

export interface SetupDraft {
  raw_prompt: string;
  structured_hints: Record<string, string>;
  ai_response: AISetupResponse | null;
  follow_up_answers: Record<string, string>;
  manual_edits: Record<string, unknown>;
  status: 'describing' | 'clarifying' | 'reviewing' | 'confirmed' | 'abandoned';
}

export type AISetupStep = 'describe' | 'clarify' | 'review' | 'confirm';

// Friendly labels for field names
export const FIELD_LABELS: Record<string, string> = {
  tournament_name: 'Tournament Name',
  sport: 'Sport',
  tournament_level: 'Tournament Level',
  age_group: 'Age Group',
  gender_division: 'Gender Division',
  season_year: 'Season / Year',
  description: 'Description',
  start_date: 'Start Date',
  end_date: 'End Date',
  daily_start_time: 'Daily Start Time',
  daily_end_time: 'Daily End Time',
  timezone: 'Timezone',
  match_duration_minutes: 'Match Duration (min)',
  venue_name: 'Venue Name',
  venue_address: 'Venue Address',
  court_count: 'Number of Courts',
  court_names: 'Court Names',
  format_type: 'Tournament Format',
  number_of_teams: 'Number of Teams',
  team_names: 'Team Names',
  number_of_pools: 'Number of Pools',
  teams_per_pool: 'Teams Per Pool',
  seeding_method: 'Seeding Method',
  halves_or_quarters: 'Halves / Quarters',
  halftime_duration_minutes: 'Halftime Duration (min)',
  break_between_matches_minutes: 'Break Between Matches (min)',
  allow_draws_in_pool_stage: 'Allow Draws in Pool Stage',
  allow_draws_in_knockout: 'Allow Draws in Knockout',
  points_for_win: 'Points for Win',
  points_for_draw: 'Points for Draw',
  points_for_loss: 'Points for Loss',
  standings_tiebreak_order: 'Tiebreak Order',
  teams_qualifying_per_pool: 'Teams Qualifying Per Pool',
  wildcard_rules: 'Wildcard Rules',
  playoff_brackets: 'Playoff Brackets',
  playoff_format_description: 'Playoff Format',
  registration_open: 'Registration Open',
  registration_deadline: 'Registration Deadline',
  entry_fee: 'Entry Fee',
  max_teams_registration: 'Max Teams (Registration)',
  medical_contact: 'Medical Contact',
  host_org: 'Host Organisation',
  contact_person: 'Contact Person',
};

export const SOURCE_LABELS: Record<FieldSource, string> = {
  user: 'From your description',
  ai: 'AI inferred',
  default: 'System default',
  needs_confirmation: 'Needs confirmation',
};

export const SOURCE_COLORS: Record<FieldSource, string> = {
  user: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  ai: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  default: 'bg-muted text-muted-foreground border-border',
  needs_confirmation: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
};

// Field groupings for the review screen
export const FIELD_GROUPS = [
  {
    title: 'Tournament Identity',
    fields: ['tournament_name', 'sport', 'tournament_level', 'age_group', 'gender_division', 'season_year', 'description'],
  },
  {
    title: 'Competition Structure',
    fields: ['format_type', 'number_of_teams', 'number_of_pools', 'teams_per_pool', 'seeding_method'],
  },
  {
    title: 'Points & Standings',
    fields: ['points_for_win', 'points_for_draw', 'points_for_loss', 'standings_tiebreak_order'],
  },
  {
    title: 'Schedule',
    fields: ['start_date', 'end_date', 'daily_start_time', 'daily_end_time', 'timezone', 'match_duration_minutes', 'halves_or_quarters', 'halftime_duration_minutes', 'break_between_matches_minutes'],
  },
  {
    title: 'Venue',
    fields: ['venue_name', 'venue_address', 'court_count', 'court_names'],
  },
  {
    title: 'Match Rules',
    fields: ['allow_draws_in_pool_stage', 'allow_draws_in_knockout'],
  },
  {
    title: 'Playoff Format',
    fields: ['teams_qualifying_per_pool', 'wildcard_rules', 'playoff_brackets', 'playoff_format_description'],
  },
  {
    title: 'Registration & Operations',
    fields: ['registration_open', 'registration_deadline', 'entry_fee', 'max_teams_registration', 'host_org', 'contact_person', 'medical_contact'],
  },
];

// Example prompts for testing / quick-fill
export const EXAMPLE_PROMPTS = [
  {
    label: '12-team netball tournament',
    prompt: 'Create a U16 girls netball tournament for 12 teams over two days, 3 pools of 4, 3 points for a win and 1 for a draw. Tiebreaks are goal difference, goals for, then head-to-head. Top 2 in each pool plus best 2 third-placed teams go to Cup quarterfinals.',
  },
  {
    label: 'Round robin, no playoffs',
    prompt: 'Set up an open netball tournament for 8 teams on 1 August at La Rochelle, full round robin with no playoffs.',
  },
  {
    label: 'School invitational 16 teams',
    prompt: 'Create a school invitational for 16 teams with 4 pools of 4 and Cup plus Plate playoffs.',
  },
  {
    label: 'One-day 10-team event',
    prompt: 'Need a one-day U14 girls event with 10 teams, 2 courts, 20-minute matches, and pool play before finals.',
  },
];
