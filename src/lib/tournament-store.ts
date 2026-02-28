import { Tournament, Team, Pool, Fixture, Standing, PlayoffMatch } from './types';

const STORAGE_KEY = 'tournament-manager-data';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getDefaultTournament(): Tournament {
  return {
    id: generateId(),
    name: 'My Tournament',
    teams: [],
    pools: [],
    fixtures: [],
    playoffs: [],
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
  };
}

export function loadTournament(): Tournament {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return getDefaultTournament();
}

export function saveTournament(t: Tournament): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
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
