import { useState, useEffect, useRef } from 'react';
import { Tournament, UserRole } from '@/lib/types';
import { loadTournament, saveTournament, getDefaultTournament } from '@/lib/tournament-store';
import { TeamManager } from '@/components/TeamManager';
import { PoolManager } from '@/components/PoolManager';
import { FixtureManager } from '@/components/FixtureManager';
import { StandingsView } from '@/components/StandingsView';
import { PlayoffBracket } from '@/components/PlayoffBracket';
import { PlayerManager } from '@/components/PlayerManager';
import { LoginPage } from '@/components/LoginPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trophy, Users, Layers, Calendar, BarChart3, Swords, RotateCcw, Sun, Moon, LogOut, Camera, Settings, UserPlus } from 'lucide-react';

const Index = () => {
  const [tournament, setTournament] = useState<Tournament>(loadTournament);
  const [role, setRole] = useState<UserRole | null>(() => {
    const stored = sessionStorage.getItem('tournament-role');
    return stored === 'admin' || stored === 'viewer' ? stored : null;
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    saveTournament(tournament);
  }, [tournament]);

  const handleLogin = (r: UserRole) => {
    setRole(r);
    sessionStorage.setItem('tournament-role', r);
  };

  const handleLogout = () => {
    setRole(null);
    sessionStorage.removeItem('tournament-role');
  };

  const handleChange = (t: Tournament) => {
    if (!isAdmin) return;
    setTournament(t);
  };

  const handleReset = () => {
    if (!isAdmin) return;
    if (confirm('Reset all tournament data? This cannot be undone.')) {
      setTournament(getDefaultTournament());
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setTournament(prev => ({ ...prev, logo: dataUrl }));
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleChangePassword = () => {
    if (!newPassword.trim()) return;
    localStorage.setItem('tournament-admin-password', newPassword.trim());
    setNewPassword('');
    setShowPasswordSettings(false);
  };

  if (!role) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const stats = {
    teams: tournament.teams.length,
    pools: tournament.pools.length,
    played: tournament.fixtures.filter(f => f.played).length,
    total: tournament.fixtures.length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ESPN-style yellow top bar */}
      <div className="h-1 gold-gradient" />

      {/* Header */}
      <header className="tournament-gradient text-primary-foreground">
        <div className="container py-3 sm:py-4 px-3 sm:px-8">
          {/* Top row: logo + name + actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Logo */}
              <div className="relative group flex-shrink-0">
                {tournament.logo ? (
                  <img
                    src={tournament.logo}
                    alt="Tournament logo"
                    className="h-9 w-9 sm:h-12 sm:w-12 rounded object-cover border-2 border-accent/40"
                  />
                ) : (
                  <div className="h-9 w-9 sm:h-12 sm:w-12 rounded bg-accent/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-accent" />
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-background/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="h-4 w-4 text-foreground" />
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              <div className="min-w-0 flex-1">
                {isAdmin ? (
                  <>
                    <Input
                      value={tournament.name}
                      onChange={e => setTournament({ ...tournament, name: e.target.value })}
                      className="text-lg sm:text-2xl font-bold bg-transparent border-none text-primary-foreground placeholder:text-primary-foreground/50 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-display)' }}
                    />
                    <Input
                      value={tournament.managerName}
                      onChange={e => setTournament({ ...tournament, managerName: e.target.value })}
                      className="text-[10px] sm:text-xs bg-transparent border-none text-primary-foreground/60 placeholder:text-primary-foreground/30 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 uppercase tracking-widest"
                      placeholder="Tournament Manager"
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-lg sm:text-2xl text-primary-foreground tracking-wider truncate">{tournament.name}</h1>
                    <p className="text-[10px] sm:text-xs text-primary-foreground/60 uppercase tracking-widest truncate">{tournament.managerName}</p>
                  </>
                )}
              </div>
            </div>
            {/* Action buttons - compact on mobile */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground/50" />
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground/50" />
              </div>
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordSettings(!showPasswordSettings)}
                    className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 w-7 sm:h-8 sm:w-8 p-0"
                  >
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 sm:h-8 px-1.5 sm:px-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">Reset</span>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 sm:h-8 px-1.5 sm:px-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">{isAdmin ? 'Admin' : 'Viewer'}</span>
              </Button>
            </div>
          </div>

          {/* Stats ticker - scrollable on mobile */}
          <div className="flex gap-0 text-[10px] sm:text-xs mt-2 overflow-x-auto">
            <span className="bg-accent text-accent-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
              {stats.teams} Teams
            </span>
            <span className="bg-primary-foreground/10 text-primary-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-primary-foreground/10 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
              {stats.pools} Pools
            </span>
            <span className="bg-primary-foreground/10 text-primary-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-primary-foreground/10 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
              {stats.played}/{stats.total} Played
            </span>
          </div>

          {/* Password Settings */}
          {showPasswordSettings && isAdmin && (
            <div className="mt-3 p-3 rounded bg-primary-foreground/5 border border-primary-foreground/10 max-w-sm">
              <p className="text-xs font-bold text-primary-foreground mb-2 uppercase tracking-wide">Change Admin Password</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  className="h-8 text-sm bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40"
                />
                <Button size="sm" onClick={handleChangePassword} className="h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase">Save</Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Yellow accent bar below header */}
      <div className="h-1 gold-gradient" />

      {/* Main content */}
      <main className="container py-4 sm:py-6 px-3 sm:px-8">
        {isAdmin ? (
          <Tabs defaultValue="teams" className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex sm:grid sm:grid-cols-6 w-auto sm:w-full sm:max-w-3xl bg-card border rounded-none h-auto p-0">
                <TabsTrigger value="teams" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Teams
                </TabsTrigger>
                <TabsTrigger value="players" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Players
                </TabsTrigger>
                <TabsTrigger value="pools" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Pools
                </TabsTrigger>
                <TabsTrigger value="fixtures" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Fixtures
                </TabsTrigger>
                <TabsTrigger value="standings" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Standings
                </TabsTrigger>
                <TabsTrigger value="playoffs" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Playoffs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="teams">
              <TeamManager tournament={tournament} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="players">
              <PlayerManager tournament={tournament} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="pools">
              <PoolManager tournament={tournament} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="fixtures">
              <FixtureManager tournament={tournament} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="standings">
              <StandingsView tournament={tournament} />
            </TabsContent>
            <TabsContent value="playoffs">
              <PlayoffBracket tournament={tournament} onChange={handleChange} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Viewer: read-only tabs */
          <Tabs defaultValue="standings" className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex sm:grid sm:grid-cols-4 w-auto sm:w-full sm:max-w-lg bg-card border rounded-none h-auto p-0">
                <TabsTrigger value="standings" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Standings
                </TabsTrigger>
                <TabsTrigger value="fixtures" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Fixtures
                </TabsTrigger>
                <TabsTrigger value="players" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Players
                </TabsTrigger>
                <TabsTrigger value="playoffs" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Playoffs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="standings">
              <StandingsView tournament={tournament} />
            </TabsContent>
            <TabsContent value="fixtures">
              <ViewerFixtures tournament={tournament} />
            </TabsContent>
            <TabsContent value="players">
              <ViewerPlayers tournament={tournament} />
            </TabsContent>
            <TabsContent value="playoffs">
              <ViewerPlayoffs tournament={tournament} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

/* Read-only fixture view for viewers */
function ViewerFixtures({ tournament }: { tournament: Tournament }) {
  const getName = (t: Tournament, id: string | null) => {
    if (!id) return 'TBD';
    return t.teams.find(tm => tm.id === id)?.name || 'Unknown';
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent" />
        <h2 className="text-xl">Fixtures</h2>
      </div>
      {tournament.pools.map(pool => {
        const poolFixtures = tournament.fixtures
          .filter(f => f.poolId === pool.id)
          .sort((a, b) => a.round - b.round);
        if (poolFixtures.length === 0) return null;
        const rounds = [...new Set(poolFixtures.map(f => f.round))].sort((a, b) => a - b);
        return (
          <div key={pool.id} className="space-y-3">
            <div className="espn-section-header">{pool.name}</div>
            {rounds.map(round => (
              <div key={round} className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Round {round}</p>
                {poolFixtures.filter(f => f.round === round).map(fixture => (
                  <div key={fixture.id} className="stat-card flex items-center justify-between gap-2">
                    <span className="font-medium text-sm flex-1 text-right">
                      {getName(tournament, fixture.homeTeamId)}
                    </span>
                    <span className={`px-3 py-1 rounded text-sm font-bold min-w-[70px] text-center score-badge ${
                      fixture.played ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {fixture.played ? `${fixture.homeScore} - ${fixture.awayScore}` : 'VS'}
                    </span>
                    <span className="font-medium text-sm flex-1">
                      {getName(tournament, fixture.awayTeamId)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
      {tournament.fixtures.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">No fixtures yet</p>
      )}
    </div>
  );
}

/* Read-only player list for viewers */
function ViewerPlayers({ tournament }: { tournament: Tournament }) {
  const [filterTeam, setFilterTeam] = useState('all');
  const players = (tournament.players || []).filter(
    p => filterTeam === 'all' || p.teamId === filterTeam
  );
  const getTeamName = (teamId: string) =>
    tournament.teams.find(t => t.id === teamId)?.name || 'Unassigned';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-accent" />
          <h2 className="text-xl">Players</h2>
          <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {players.length}
          </span>
        </div>
        {tournament.teams.length > 0 && (
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-card text-foreground"
          >
            <option value="all">All Teams</option>
            {tournament.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {players.length > 0 ? (
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="tournament-gradient text-primary-foreground">
                <th className="text-left py-2.5 px-3 font-bold text-xs uppercase tracking-wider">#</th>
                <th className="text-left py-2.5 px-3 font-bold text-xs uppercase tracking-wider">Name</th>
                <th className="text-center py-2.5 px-3 font-bold text-xs uppercase tracking-wider">No.</th>
                <th className="text-left py-2.5 px-3 font-bold text-xs uppercase tracking-wider">Position</th>
                <th className="text-left py-2.5 px-3 font-bold text-xs uppercase tracking-wider">Team</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr key={player.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium">{player.name}</td>
                  <td className="text-center py-2.5 px-3 score-badge">{player.jerseyNumber || '—'}</td>
                  <td className="py-2.5 px-3 text-muted-foreground capitalize">{player.position || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                      {getTeamName(player.teamId)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm py-8 text-center">No players registered yet</p>
      )}
    </div>
  );
}

/* Read-only playoff view for viewers */
function ViewerPlayoffs({ tournament }: { tournament: Tournament }) {
  const getName = (t: Tournament, id: string | null) => {
    if (!id) return 'TBD';
    return t.teams.find(tm => tm.id === id)?.name || 'Unknown';
  };
  const rounds = [...new Set(tournament.playoffs.map(m => m.round))].sort((a, b) => b - a);
  const getRoundName = (round: number) => {
    if (round === 1) return 'Final';
    if (round === 2) return 'Semi-Finals';
    if (round === 4) return 'Quarter-Finals';
    return `Round of ${round * 2}`;
  };

  if (tournament.playoffs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-accent" />
          <h2 className="text-xl">Playoffs</h2>
        </div>
        <p className="text-muted-foreground text-sm py-8 text-center">Playoffs not generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-accent" />
        <h2 className="text-xl">Playoffs</h2>
      </div>
      <div className="flex gap-8 overflow-x-auto pb-4">
        {rounds.map(round => (
          <div key={round} className="flex-shrink-0 space-y-3 min-w-[220px]">
            <div className="espn-section-header text-center text-sm">
              {getRoundName(round)}
            </div>
            <div className="space-y-4" style={{ paddingTop: `${(rounds[0] / round - 1) * 40}px` }}>
              {tournament.playoffs
                .filter(m => m.round === round)
                .sort((a, b) => a.position - b.position)
                .map(match => (
                  <div
                    key={match.id}
                    className={`rounded border p-3 space-y-1 bg-card ${round === 1 ? 'border-l-4 border-l-accent' : ''}`}
                    style={{ marginBottom: `${(rounds[0] / round - 1) * 40}px` }}
                  >
                    <div className={`flex justify-between text-sm ${match.played && match.homeScore! > match.awayScore! ? 'font-bold' : ''}`}>
                      <span className="truncate">{getName(tournament, match.homeTeamId)}</span>
                      {match.played && <span className="score-badge">{match.homeScore}</span>}
                    </div>
                    <div className={`flex justify-between text-sm ${match.played && match.awayScore! > match.homeScore! ? 'font-bold' : ''}`}>
                      <span className="truncate">{getName(tournament, match.awayTeamId)}</span>
                      {match.played && <span className="score-badge">{match.awayScore}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Index;
