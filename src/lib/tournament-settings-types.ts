export interface TournamentSettings {
  // 1. Basic Identity
  name: string;
  sport_type: string;
  tournament_format: string;
  season: string;
  description: string;
  status: 'draft' | 'open' | 'active' | 'completed';

  // 2. Date & Time
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  timezone: string;
  match_duration: number | null;
  halftime_structure: string;
  break_time: number | null;

  // 3. Venue
  venue_name: string;
  venue_address: string;
  num_courts: number | null;
  court_names: string[];
  indoor_outdoor: string;
  venue_notes: string;

  // 4. Competition Structure
  num_pools: number | null;
  max_teams: number | null;
  teams_per_pool: number | null;
  points_for_win: number;
  points_for_draw: number;
  points_for_loss: number;
  tiebreak_rules: string[];
  playoff_qualification: string;
  placement_rules: string;

  // 5. Match Rules
  regulation_length: number | null;
  extra_time_allowed: boolean;
  penalty_rules: string;
  draws_allowed_pools: boolean;
  draws_allowed_playoffs: boolean;
  scoring_rules: string;
  forfeit_rule: string;
  late_arrival_rule: string;
  forfeit_score_treatment: string;

  // 6. Access
  is_public: boolean;
  invite_code: string;

  // 7. Branding
  theme_color: string;
  sponsor_names: string[];
  host_org: string;
  contact_person: string;
  contact_details: string;
  manager_name: string;

  // 8. Registration
  registration_open: boolean;
  registration_deadline: string;
  entry_fee: string;
  max_teams_registration: number | null;
  age_group: string;
  gender_category: string;
  school_club_category: string;

  // 9. Operational
  medical_contact: string;
  rules_doc: string;
  code_of_conduct: string;
  weather_notes: string;
  announcements: string;
}

export function getDefaultSettings(): TournamentSettings {
  return {
    name: '',
    sport_type: '',
    tournament_format: '',
    season: '',
    description: '',
    status: 'draft',
    start_date: '',
    end_date: '',
    daily_start_time: '',
    daily_end_time: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    match_duration: null,
    halftime_structure: '',
    break_time: null,
    venue_name: '',
    venue_address: '',
    num_courts: null,
    court_names: [],
    indoor_outdoor: '',
    venue_notes: '',
    num_pools: null,
    max_teams: null,
    teams_per_pool: null,
    points_for_win: 3,
    points_for_draw: 1,
    points_for_loss: 0,
    tiebreak_rules: [],
    playoff_qualification: '',
    placement_rules: '',
    regulation_length: null,
    extra_time_allowed: false,
    penalty_rules: '',
    draws_allowed_pools: true,
    draws_allowed_playoffs: false,
    scoring_rules: '',
    forfeit_rule: '',
    late_arrival_rule: '',
    forfeit_score_treatment: '',
    is_public: true,
    invite_code: '',
    theme_color: '',
    sponsor_names: [],
    host_org: '',
    contact_person: '',
    contact_details: '',
    manager_name: '',
    registration_open: false,
    registration_deadline: '',
    entry_fee: '',
    max_teams_registration: null,
    age_group: '',
    gender_category: '',
    school_club_category: '',
    medical_contact: '',
    rules_doc: '',
    code_of_conduct: '',
    weather_notes: '',
    announcements: '',
  };
}
