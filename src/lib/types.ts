export interface Team {
  id: string;
  name: string;
  poolId: string | null;
}

export interface Pool {
  id: string;
  name: string;
  teamIds: string[];
}

export interface Fixture {
  id: string;
  poolId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  round: number;
  date: string | null;
  time: string | null;
  venue: string | null;
}

export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string | null;
  jerseyNumber: string;
  position: string;
}

export interface PlayoffMatch {
  id: string;
  round: number; // 1 = final, 2 = semi, 4 = quarter, etc.
  position: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  date: string | null;
  time: string | null;
  venue: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  managerName: string;
  logo: string | null; // base64 data URL
  teams: Team[];
  pools: Pool[];
  fixtures: Fixture[];
  playoffs: PlayoffMatch[];
  players: Player[];
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  closedRounds: Record<string, number[]>; // poolId -> array of closed round numbers
}

export type UserRole = 'admin' | 'viewer';
