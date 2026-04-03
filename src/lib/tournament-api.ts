import { RealtimeChannel } from '@supabase/supabase-js';
import { Tournament, Pool, Team, Fixture, PlayoffMatch, PlayoffFlow, Player, UserRole } from './types';
import { supabase } from './supabase';
import { getDefaultTournament } from './tournament-store';

type ProfileRow = {
  id: string;
  email: string | null;
  role: UserRole;
};

type TournamentRow = {
  id: string;
  name: string;
  manager_name: string;
  logo_path: string | null;
  is_public: boolean;
  points_for_win: number;
  points_for_draw: number;
  points_for_loss: number;
  closed_rounds: Record<string, number[]> | null;
  playoff_round_names: Record<number, string> | null;
  third_place_match: PlayoffMatch | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type PoolRow = { id: string; tournament_id: string; name: string };
type TeamRow = { id: string; tournament_id: string; pool_id: string | null; name: string };
type PlayerRow = { id: string; tournament_id: string; team_id: string | null; name: string; jersey_number: string; position: string };
type FixtureRow = {
  id: string;
  tournament_id: string;
  pool_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  round: number;
  date: string | null;
  time: string | null;
  venue: string | null;
};
type PlayoffRow = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  date: string | null;
  time: string | null;
  venue: string | null;
};

function publicLogoUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('tournament-assets').getPublicUrl(path);
  return data.publicUrl;
}

function toTournament(row: TournamentRow, pools: PoolRow[], teams: TeamRow[], fixtures: FixtureRow[], playoffs: PlayoffRow[], players: PlayerRow[]): Tournament {
  const tournament = getDefaultTournament();
  tournament.id = row.id;
  tournament.name = row.name;
  tournament.managerName = row.manager_name;
  tournament.logo = publicLogoUrl(row.logo_path);
  tournament.pointsForWin = row.points_for_win;
  tournament.pointsForDraw = row.points_for_draw;
  tournament.pointsForLoss = row.points_for_loss;
  tournament.closedRounds = row.closed_rounds ?? {};
  tournament.playoffRoundNames = row.playoff_round_names ?? {};

  // Backward-compatible load: third_place_match may be a single PlayoffMatch (old)
  // or a { thirdPlaceMatch, additionalPlayoffs } envelope (new)
  const tpmRaw = row.third_place_match as unknown;
  if (tpmRaw && typeof tpmRaw === 'object' && !Array.isArray(tpmRaw) && 'additionalPlayoffs' in (tpmRaw as object)) {
    const envelope = tpmRaw as { thirdPlaceMatch: PlayoffMatch | null; additionalPlayoffs: PlayoffFlow[] };
    tournament.thirdPlaceMatch = envelope.thirdPlaceMatch ?? null;
    tournament.additionalPlayoffs = envelope.additionalPlayoffs ?? [];
  } else if (tpmRaw && typeof tpmRaw === 'object') {
    // Old format: single PlayoffMatch
    tournament.thirdPlaceMatch = tpmRaw as PlayoffMatch;
    tournament.additionalPlayoffs = [];
  } else {
    tournament.thirdPlaceMatch = null;
    tournament.additionalPlayoffs = [];
  }

  tournament.pools = pools.map((pool): Pool => ({
    id: pool.id,
    name: pool.name,
    teamIds: teams.filter((team) => team.pool_id === pool.id).map((team) => team.id),
  }));
  tournament.teams = teams.map((team): Team => ({
    id: team.id,
    name: team.name,
    poolId: team.pool_id,
  }));
  tournament.players = players.map((player): Player => ({
    id: player.id,
    name: player.name,
    teamId: player.team_id,
    jerseyNumber: player.jersey_number,
    position: player.position,
  }));
  tournament.fixtures = fixtures.map((fixture): Fixture => ({
    id: fixture.id,
    poolId: fixture.pool_id,
    homeTeamId: fixture.home_team_id,
    awayTeamId: fixture.away_team_id,
    homeScore: fixture.home_score,
    awayScore: fixture.away_score,
    played: fixture.played,
    round: fixture.round,
    date: fixture.date,
    time: fixture.time,
    venue: fixture.venue,
  }));
  tournament.playoffs = playoffs.map((match): PlayoffMatch => ({
    id: match.id,
    round: match.round,
    position: match.position,
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeScore: match.home_score,
    awayScore: match.away_score,
    played: match.played,
    date: match.date ?? null,
    time: match.time ?? null,
    venue: match.venue ?? null,
  }));
  return tournament;
}

async function getFirstTournamentId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.id ?? null;
}

export async function getSessionProfile(): Promise<{ user: { id: string; email?: string | null } | null; profile: ProfileRow | null }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user ?? null;
  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: (profile as ProfileRow | null) ?? null,
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function subscribeToAuthChanges(callback: () => void) {
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}

export async function ensureDefaultTournament(canCreate = false): Promise<string | null> {
  const existingId = await getFirstTournamentId();
  if (existingId) return existingId;
  if (!canCreate) return null;

  const starter = getDefaultTournament();
  const { data: created, error } = await supabase
    .from('tournaments')
    .insert({
      id: starter.id,
      name: starter.name,
      manager_name: starter.managerName,
      logo_path: null,
      is_public: true,
      points_for_win: starter.pointsForWin,
      points_for_draw: starter.pointsForDraw,
      points_for_loss: starter.pointsForLoss,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

export async function fetchTournament(tournamentId: string): Promise<Tournament> {
  const [tournamentRes, poolsRes, teamsRes, fixturesRes, playoffsRes, playersRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('pools').select('*').eq('tournament_id', tournamentId).order('name'),
    supabase.from('teams').select('*').eq('tournament_id', tournamentId).order('name'),
    supabase.from('fixtures').select('*').eq('tournament_id', tournamentId).order('round').order('date', { ascending: true, nullsFirst: true }),
    supabase.from('playoff_matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: false }).order('position'),
    supabase.from('players').select('*').eq('tournament_id', tournamentId).order('name'),
  ]);

  if (tournamentRes.error) throw tournamentRes.error;
  if (poolsRes.error) throw poolsRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (fixturesRes.error) throw fixturesRes.error;
  if (playoffsRes.error) throw playoffsRes.error;
  if (playersRes.error) throw playersRes.error;

  return toTournament(
    tournamentRes.data as TournamentRow,
    (poolsRes.data ?? []) as PoolRow[],
    (teamsRes.data ?? []) as TeamRow[],
    (fixturesRes.data ?? []) as FixtureRow[],
    (playoffsRes.data ?? []) as PlayoffRow[],
    (playersRes.data ?? []) as PlayerRow[],
  );
}

export async function saveTournamentState(tournament: Tournament): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id ?? null;

  // --- Step 1: Upsert tournament metadata (safe, no data loss) ---
  const basePayload = {
    id: tournament.id,
    name: tournament.name,
    manager_name: tournament.managerName,
    points_for_win: tournament.pointsForWin,
    points_for_draw: tournament.pointsForDraw,
    points_for_loss: tournament.pointsForLoss,
    closed_rounds: tournament.closedRounds,
    created_by: userId,
    is_public: true,
  };

  const { error: fullUpsertError } = await supabase
    .from('tournaments')
    .upsert({
      ...basePayload,
      playoff_round_names: tournament.playoffRoundNames ?? {},
      third_place_match: tournament.thirdPlaceMatch ?? null,
    });

  if (fullUpsertError) {
    if (fullUpsertError.message?.includes('column') || fullUpsertError.code === '42703') {
      console.warn('Playoff columns not in DB yet, saving without them:', fullUpsertError.message);
      const { error: fallbackError } = await supabase.from('tournaments').upsert(basePayload);
      if (fallbackError) throw fallbackError;
    } else {
      throw fullUpsertError;
    }
  }

  // --- Step 2: Upsert active records, then delete soft-deleted and stale ones ---
  // Only send non-deleted records to the DB. Soft-deleted records get physically removed on save.

  const livePools = tournament.pools.filter(p => !p.isDeleted);
  const liveTeams = tournament.teams.filter(t => !t.isDeleted);
  const livePlayers = tournament.players.filter(p => !p.isDeleted);
  const liveFixtures = tournament.fixtures.filter(f => !f.isDeleted);
  const livePlayoffs = tournament.playoffs.filter(m => !m.isDeleted);

  // Pools
  if (livePools.length > 0) {
    const { error } = await supabase.from('pools').upsert(
      livePools.map((pool) => ({
        id: pool.id,
        tournament_id: tournament.id,
        name: pool.name,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const livePoolIds = livePools.map(p => p.id);
  if (livePoolIds.length > 0) {
    await supabase.from('pools').delete().eq('tournament_id', tournament.id).not('id', 'in', `(${livePoolIds.join(',')})`);
  } else {
    await supabase.from('pools').delete().eq('tournament_id', tournament.id);
  }

  // Teams
  if (liveTeams.length > 0) {
    const { error } = await supabase.from('teams').upsert(
      liveTeams.map((team) => ({
        id: team.id,
        tournament_id: tournament.id,
        pool_id: team.poolId,
        name: team.name,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const liveTeamIds = liveTeams.map(t => t.id);
  if (liveTeamIds.length > 0) {
    await supabase.from('teams').delete().eq('tournament_id', tournament.id).not('id', 'in', `(${liveTeamIds.join(',')})`);
  } else {
    await supabase.from('teams').delete().eq('tournament_id', tournament.id);
  }

  // Players
  if (livePlayers.length > 0) {
    const { error } = await supabase.from('players').upsert(
      livePlayers.map((player) => ({
        id: player.id,
        tournament_id: tournament.id,
        team_id: player.teamId,
        name: player.name,
        jersey_number: player.jerseyNumber,
        position: player.position,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const livePlayerIds = livePlayers.map(p => p.id);
  if (livePlayerIds.length > 0) {
    await supabase.from('players').delete().eq('tournament_id', tournament.id).not('id', 'in', `(${livePlayerIds.join(',')})`);
  } else {
    await supabase.from('players').delete().eq('tournament_id', tournament.id);
  }

  // Fixtures
  if (liveFixtures.length > 0) {
    const { error } = await supabase.from('fixtures').upsert(
      liveFixtures.map((fixture) => ({
        id: fixture.id,
        tournament_id: tournament.id,
        pool_id: fixture.poolId,
        home_team_id: fixture.homeTeamId,
        away_team_id: fixture.awayTeamId,
        home_score: fixture.homeScore,
        away_score: fixture.awayScore,
        played: fixture.played,
        round: fixture.round,
        date: fixture.date,
        time: fixture.time,
        venue: fixture.venue,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const liveFixtureIds = liveFixtures.map(f => f.id);
  if (liveFixtureIds.length > 0) {
    await supabase.from('fixtures').delete().eq('tournament_id', tournament.id).not('id', 'in', `(${liveFixtureIds.join(',')})`);
  } else {
    await supabase.from('fixtures').delete().eq('tournament_id', tournament.id);
  }

  // Playoff matches
  if (livePlayoffs.length > 0) {
    const { error } = await supabase.from('playoff_matches').upsert(
      livePlayoffs.map((match) => ({
        id: match.id,
        tournament_id: tournament.id,
        round: match.round,
        position: match.position,
        home_team_id: match.homeTeamId,
        away_team_id: match.awayTeamId,
        home_score: match.homeScore,
        away_score: match.awayScore,
        played: match.played,
        date: match.date,
        time: match.time,
        venue: match.venue,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const livePlayoffIds = livePlayoffs.map(m => m.id);
  if (livePlayoffIds.length > 0) {
    await supabase.from('playoff_matches').delete().eq('tournament_id', tournament.id).not('id', 'in', `(${livePlayoffIds.join(',')})`);
  } else {
    await supabase.from('playoff_matches').delete().eq('tournament_id', tournament.id);
  }
}

export async function resetTournament(tournamentId: string): Promise<Tournament> {
  const starter = getDefaultTournament();
  starter.id = tournamentId;
  await saveTournamentState(starter);
  const { error } = await supabase.from('tournaments').update({ logo_path: null }).eq('id', tournamentId);
  if (error) throw error;
  return starter;
}

export async function uploadTournamentLogo(tournamentId: string, file: File): Promise<string | null> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const filePath = `${tournamentId}/logo.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('tournament-assets')
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ logo_path: filePath })
    .eq('id', tournamentId);
  if (updateError) throw updateError;

  return publicLogoUrl(filePath);
}

export function subscribeToTournamentRealtime(tournamentId: string, onChange: () => void): () => void {
  const tables = ['pools', 'teams', 'players', 'fixtures', 'playoff_matches'];
  const channels: RealtimeChannel[] = tables.map((table) =>
    supabase
      .channel(`tournament-${table}-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => onChange())
      .subscribe()
  );

  const tournamentChannel = supabase
    .channel(`tournament-meta-${tournamentId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tournaments',
      filter: `id=eq.${tournamentId}`,
    }, () => onChange())
    .subscribe();

  channels.push(tournamentChannel);

  return () => {
    channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });
  };
}
