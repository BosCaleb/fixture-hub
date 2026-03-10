import { Tournament, Team, Pool, Fixture, Standing, PlayoffMatch, Player } from './types';

function generateId(): string {
  return crypto.randomUUID();
}

export function getDefaultTournament(): Tournament {
  return {
    id: generateId(),
    name: 'My Tournament',
    managerName: 'Tournament Manager',
    logo: null,
    teams: [],
    pools: [],
    fixtures: [],
    playoffs: [],
    players: [],
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
  };
}

export function loadTournament(): Tournament {
  return getDefaultTournament();
}

export function saveTournament(_t: Tournament): void {
  // Persist through Supabase instead of localStorage.
}

export function addTeam(t: Tournament, name: string): Tournament {
  const team: Team = { id: generateId(), name, poolId: null };
  return { ...t, teams: [...t.teams, team] };
}

export function removeTeam(t: Tournament, teamId: string): Tournament {
  const pools = t.pools.map(p => ({
    ...p,
    teamIds: p.teamIds.filter(id => id !== teamId),
  }));
  return {
    ...t,
    teams: t.teams.filter(tm => tm.id !== teamId),
    pools,
    fixtures: t.fixtures.filter(f => f.homeTeamId !== teamId && f.awayTeamId !== teamId),
  };
}

export function addPool(t: Tournament, name: string): Tournament {
  const pool: Pool = { id: generateId(), name, teamIds: [] };
  return { ...t, pools: [...t.pools, pool] };
}

export function removePool(t: Tournament, poolId: string): Tournament {
  const teams = t.teams.map(tm => tm.poolId === poolId ? { ...tm, poolId: null } : tm);
  return {
    ...t,
    teams,
    pools: t.pools.filter(p => p.id !== poolId),
    fixtures: t.fixtures.filter(f => f.poolId !== poolId),
  };
}

export function assignTeamToPool(t: Tournament, teamId: string, poolId: string): Tournament {
  const teams = t.teams.map(tm => tm.id === teamId ? { ...tm, poolId } : tm);
  const pools = t.pools.map(p => {
    if (p.id === poolId && !p.teamIds.includes(teamId)) {
      return { ...p, teamIds: [...p.teamIds, teamId] };
    }
    if (p.id !== poolId && p.teamIds.includes(teamId)) {
      return { ...p, teamIds: p.teamIds.filter(id => id !== teamId) };
    }
    return p;
  });
  return { ...t, teams, pools };
}

export function removeTeamFromPool(t: Tournament, teamId: string, poolId: string): Tournament {
  const teams = t.teams.map(tm => tm.id === teamId ? { ...tm, poolId: null } : tm);
  const pools = t.pools.map(p =>
    p.id === poolId ? { ...p, teamIds: p.teamIds.filter(id => id !== teamId) } : p
  );
  return { ...t, teams, pools };
}

// Round-robin fixture generation
export function generateFixtures(t: Tournament, poolId: string): Tournament {
  const pool = t.pools.find(p => p.id === poolId);
  if (!pool || pool.teamIds.length < 2) return t;

  const teamIds = [...pool.teamIds];
  const fixtures: Fixture[] = [];

  // If odd, add a "bye"
  if (teamIds.length % 2 !== 0) teamIds.push('BYE');
  const n = teamIds.length;
  const rounds = n - 1;
  const half = n / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = teamIds[i];
      const away = teamIds[n - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      fixtures.push({
        id: generateId(),
        poolId,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: null,
        awayScore: null,
        played: false,
        round: round + 1,
        date: null,
        time: null,
        venue: null,
      });
    }
    // Rotate: fix first, rotate rest
    teamIds.splice(1, 0, teamIds.pop()!);
  }

  // Remove old fixtures for this pool, add new
  const otherFixtures = t.fixtures.filter(f => f.poolId !== poolId);
  return { ...t, fixtures: [...otherFixtures, ...fixtures] };
}

export function updateScore(t: Tournament, fixtureId: string, homeScore: number, awayScore: number): Tournament {
  const fixtures = t.fixtures.map(f =>
    f.id === fixtureId ? { ...f, homeScore, awayScore, played: true } : f
  );
  return { ...t, fixtures };
}

export function clearScore(t: Tournament, fixtureId: string): Tournament {
  const fixtures = t.fixtures.map(f =>
    f.id === fixtureId ? { ...f, homeScore: null, awayScore: null, played: false } : f
  );
  return { ...t, fixtures };
}

export function calculateStandings(t: Tournament, poolId: string): Standing[] {
  const pool = t.pools.find(p => p.id === poolId);
  if (!pool) return [];

  const standingsMap: Record<string, Standing> = {};
  pool.teamIds.forEach(teamId => {
    const team = t.teams.find(tm => tm.id === teamId);
    standingsMap[teamId] = {
      teamId,
      teamName: team?.name || 'Unknown',
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    };
  });

  t.fixtures
    .filter(f => f.poolId === poolId && f.played && f.homeScore !== null && f.awayScore !== null)
    .forEach(f => {
      const home = standingsMap[f.homeTeamId];
      const away = standingsMap[f.awayTeamId];
      if (!home || !away) return;

      home.played++;
      away.played++;
      home.goalsFor += f.homeScore!;
      home.goalsAgainst += f.awayScore!;
      away.goalsFor += f.awayScore!;
      away.goalsAgainst += f.homeScore!;

      if (f.homeScore! > f.awayScore!) {
        home.won++; away.lost++;
        home.points += t.pointsForWin;
        away.points += t.pointsForLoss;
      } else if (f.homeScore! < f.awayScore!) {
        away.won++; home.lost++;
        away.points += t.pointsForWin;
        home.points += t.pointsForLoss;
      } else {
        home.drawn++; away.drawn++;
        home.points += t.pointsForDraw;
        away.points += t.pointsForDraw;
      }

      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    });

  // Sort: points > GD > GF > head-to-head (simplified: alphabetical)
  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}

export function generatePlayoffs(t: Tournament, teamsPerPool: number): Tournament {
  if (t.pools.length === 0) return t;

  // Get top N teams from each pool
  const qualifiedTeams: string[] = [];
  t.pools.forEach(pool => {
    const standings = calculateStandings(t, pool.id);
    standings.slice(0, teamsPerPool).forEach(s => qualifiedTeams.push(s.teamId));
  });

  const totalTeams = qualifiedTeams.length;
  if (totalTeams < 2) return t;

  // Find next power of 2
  let bracketSize = 2;
  while (bracketSize < totalTeams) bracketSize *= 2;

  const playoffs: PlayoffMatch[] = [];
  // Create first round
  for (let i = 0; i < bracketSize / 2; i++) {
    const home = qualifiedTeams[i] || null;
    const away = qualifiedTeams[bracketSize - 1 - i] || null;
    playoffs.push({
      id: generateId(),
      round: bracketSize / 2,
      position: i,
      homeTeamId: home,
      awayTeamId: away,
      homeScore: null,
      awayScore: null,
      played: false,
    });
  }

  // Create subsequent rounds
  let currentRound = bracketSize / 4;
  while (currentRound >= 1) {
    for (let i = 0; i < currentRound; i++) {
      playoffs.push({
        id: generateId(),
        round: currentRound,
        position: i,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        played: false,
      });
    }
    currentRound = Math.floor(currentRound / 2);
  }

  return { ...t, playoffs };
}

export function updatePlayoffScore(t: Tournament, matchId: string, homeScore: number, awayScore: number): Tournament {
  let playoffs = t.playoffs.map(m =>
    m.id === matchId ? { ...m, homeScore, awayScore, played: true } : m
  );

  // Advance winner to next round
  const match = playoffs.find(m => m.id === matchId);
  if (match && match.played && homeScore !== awayScore) {
    const winnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
    const nextRound = Math.floor(match.round / 2);
    const nextPosition = Math.floor(match.position / 2);

    if (nextRound >= 1) {
      playoffs = playoffs.map(m => {
        if (m.round === nextRound && m.position === nextPosition) {
          if (match.position % 2 === 0) {
            return { ...m, homeTeamId: winnerId };
          } else {
            return { ...m, awayTeamId: winnerId };
          }
        }
        return m;
      });
    }
  }

  return { ...t, playoffs };
}

export function getTeamName(t: Tournament, teamId: string | null): string {
  if (!teamId) return 'TBD';
  return t.teams.find(tm => tm.id === teamId)?.name || 'Unknown';
}

export function exportToCSV(standings: Standing[], poolName: string): string {
  const header = 'Position,Team,P,W,D,L,GF,GA,GD,Pts';
  const rows = standings.map((s, i) =>
    `${i + 1},${s.teamName},${s.played},${s.won},${s.drawn},${s.lost},${s.goalsFor},${s.goalsAgainst},${s.goalDifference},${s.points}`
  );
  return `${poolName} Standings\n${header}\n${rows.join('\n')}`;
}

export function addManualFixture(t: Tournament, poolId: string, homeTeamId: string, awayTeamId: string): Tournament {
  const existingRounds = t.fixtures.filter(f => f.poolId === poolId).map(f => f.round);
  const maxRound = existingRounds.length > 0 ? Math.max(...existingRounds) : 0;
  const fixture: Fixture = {
    id: generateId(),
    poolId,
    homeTeamId,
    awayTeamId,
    homeScore: null,
    awayScore: null,
    played: false,
    round: maxRound + 1,
    date: null,
    time: null,
    venue: null,
  };
  return { ...t, fixtures: [...t.fixtures, fixture] };
}

export function exportFixturesToCSV(t: Tournament, poolId: string): string {
  const pool = t.pools.find(p => p.id === poolId);
  if (!pool) return '';
  const header = 'Round,Home,Score,Away,Status';
  const rows = t.fixtures
    .filter(f => f.poolId === poolId)
    .sort((a, b) => a.round - b.round)
    .map(f => {
      const home = getTeamName(t, f.homeTeamId);
      const away = getTeamName(t, f.awayTeamId);
      const score = f.played ? `${f.homeScore} - ${f.awayScore}` : '- vs -';
      const status = f.played ? 'Played' : 'Pending';
      return `${f.round},${home},${score},${away},${status}`;
    });
  return `${pool.name} Fixtures\n${header}\n${rows.join('\n')}`;
}

// --- Bulk CSV Templates & Imports ---

export function generateTeamTemplate(t: Tournament): string {
  const header = 'TeamName,PoolName';
  const exampleRows = ['Example Team 1,Pool A', 'Example Team 2,Pool B'];
  const poolNote = t.pools.length > 0
    ? `# Available pools: ${t.pools.map(p => p.name).join(', ')}`
    : '# No pools yet - pool names in the CSV will be auto-created';
  return `${poolNote}\n${header}\n${exampleRows.join('\n')}`;
}

export function importTeamsFromCSV(t: Tournament, csv: string): Tournament {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  // Skip header if it looks like one
  const start = lines[0]?.toLowerCase().includes('teamname') ? 1 : 0;

  let updated = { ...t, teams: [...t.teams], pools: [...t.pools] };

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    const teamName = parts[0];
    const poolName = parts[1] || '';
    if (!teamName) continue;

    // Check if team already exists
    if (updated.teams.find(tm => tm.name.toLowerCase() === teamName.toLowerCase())) continue;

    const teamId = generateId();
    let poolId: string | null = null;

    if (poolName) {
      let pool = updated.pools.find(p => p.name.toLowerCase() === poolName.toLowerCase());
      if (!pool) {
        pool = { id: generateId(), name: poolName, teamIds: [] };
        updated.pools = [...updated.pools, pool];
      }
      poolId = pool.id;
      updated.pools = updated.pools.map(p =>
        p.id === poolId ? { ...p, teamIds: [...p.teamIds, teamId] } : p
      );
    }

    updated.teams = [...updated.teams, { id: teamId, name: teamName, poolId }];
  }

  return updated;
}

export function generateFixtureTemplate(t: Tournament): string {
  const header = 'PoolName,HomeTeam,AwayTeam,Round';
  const pools = t.pools.map(p => p.name).join(', ');
  const teams = t.teams.map(tm => tm.name).join(', ');
  return `# Available pools: ${pools || 'None'}\n# Available teams: ${teams || 'None'}\n${header}\nPool A,Team 1,Team 2,1`;
}

export function importFixturesFromCSV(t: Tournament, csv: string): Tournament {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const start = lines[0]?.toLowerCase().includes('pool') ? 1 : 0;

  let updated = { ...t, fixtures: [...t.fixtures] };

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    const [poolName, homeName, awayName, roundStr] = parts;
    if (!poolName || !homeName || !awayName) continue;

    const pool = updated.pools.find(p => p.name.toLowerCase() === poolName.toLowerCase());
    const home = updated.teams.find(tm => tm.name.toLowerCase() === homeName.toLowerCase());
    const away = updated.teams.find(tm => tm.name.toLowerCase() === awayName.toLowerCase());
    if (!pool || !home || !away || home.id === away.id) continue;

    const round = parseInt(roundStr) || 1;
    updated.fixtures = [...updated.fixtures, {
      id: generateId(),
      poolId: pool.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: null,
      awayScore: null,
      played: false,
      round,
      date: null,
      time: null,
      venue: null,
    }];
  }

  return updated;
}

export function clearPlayoffScore(t: Tournament, matchId: string): Tournament {
  const match = t.playoffs.find(m => m.id === matchId);
  if (!match || !match.played) return t;

  let playoffs = t.playoffs.map(m =>
    m.id === matchId ? { ...m, homeScore: null, awayScore: null, played: false } : m
  );

  // Clear the winner from next round
  const nextRound = Math.floor(match.round / 2);
  const nextPosition = Math.floor(match.position / 2);
  if (nextRound >= 1) {
    const winnerId = match.homeScore! > match.awayScore! ? match.homeTeamId : match.awayTeamId;
    playoffs = clearAdvancedTeam(playoffs, nextRound, nextPosition, winnerId, match.position % 2 === 0);
  }

  return { ...t, playoffs };
}

function clearAdvancedTeam(playoffs: PlayoffMatch[], round: number, position: number, teamId: string | null, isHome: boolean): PlayoffMatch[] {
  return playoffs.map(m => {
    if (m.round === round && m.position === position) {
      const updated = { ...m };
      if (isHome) updated.homeTeamId = null;
      else updated.awayTeamId = null;
      // Also clear score if played
      if (updated.played) {
        updated.homeScore = null;
        updated.awayScore = null;
        updated.played = false;
      }
      return updated;
    }
    return m;
  });
}

// --- Fixture Scheduling ---

export function updateFixtureSchedule(t: Tournament, fixtureId: string, date: string | null, time: string | null, venue: string | null): Tournament {
  const fixtures = t.fixtures.map(f =>
    f.id === fixtureId ? { ...f, date, time, venue } : f
  );
  return { ...t, fixtures };
}

// --- Player Management ---

export function addPlayer(t: Tournament, name: string, teamId: string | null, jerseyNumber: string, position: string): Tournament {
  const player: Player = { id: generateId(), name, teamId, jerseyNumber, position };
  return { ...t, players: [...t.players, player] };
}

export function removePlayer(t: Tournament, playerId: string): Tournament {
  return { ...t, players: t.players.filter(p => p.id !== playerId) };
}

export function updatePlayer(t: Tournament, playerId: string, updates: Partial<Player>): Tournament {
  return { ...t, players: t.players.map(p => p.id === playerId ? { ...p, ...updates } : p) };
}

export function generatePlayerTemplate(t: Tournament): string {
  const header = 'PlayerName,TeamName,JerseyNumber,Position';
  const teams = t.teams.map(tm => tm.name).join(', ');
  return `# Available teams: ${teams || 'None'}\n# Positions: GK, DEF, MID, FWD (or any custom)\n${header}\nJohn Doe,Team A,10,MID\nJane Smith,Team B,1,GK`;
}

export function importPlayersFromCSV(t: Tournament, csv: string): Tournament {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const start = lines[0]?.toLowerCase().includes('playername') ? 1 : 0;

  let updated = { ...t, players: [...t.players] };

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    const [playerName, teamName, jerseyNumber, position] = parts;
    if (!playerName) continue;

    // Check duplicate
    if (updated.players.find(p => p.name.toLowerCase() === playerName.toLowerCase())) continue;

    let teamId: string | null = null;
    if (teamName) {
      const team = updated.teams.find(tm => tm.name.toLowerCase() === teamName.toLowerCase());
      if (team) teamId = team.id;
    }

    updated.players = [...updated.players, {
      id: generateId(),
      name: playerName,
      teamId,
      jerseyNumber: jerseyNumber || '',
      position: position || '',
    }];
  }

  return updated;
}

export function exportPlayersToCsv(t: Tournament): string {
  const header = 'PlayerName,TeamName,JerseyNumber,Position';
  const rows = t.players.map(p => {
    const teamName = p.teamId ? t.teams.find(tm => tm.id === p.teamId)?.name || '' : '';
    return `${p.name},${teamName},${p.jerseyNumber},${p.position}`;
  });
  return `Players\n${header}\n${rows.join('\n')}`;
}
