import { useState, useEffect, useRef } from 'react';
import { Tournament, UserRole } from '@/lib/types';
import { loadTournament, saveTournament, getDefaultTournament } from '@/lib/tournament-store';
import { TeamManager } from '@/components/TeamManager';
import { PoolManager } from '@/components/PoolManager';
import { FixtureManager } from '@/components/FixtureManager';
import { StandingsView } from '@/components/StandingsView';
import { PlayoffBracket } from '@/components/PlayoffBracket';
import { LoginPage } from '@/components/LoginPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trophy, Users, Layers, Calendar, BarChart3, Swords, RotateCcw, Sun, Moon, LogOut, Camera, Settings } from 'lucide-react';

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
      {/* Header */}
      <header className="tournament-gradient text-primary-foreground">
        <div className="container py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="relative group">
                {tournament.logo ? (
                  <img
                    src={tournament.logo}
                    alt="Tournament logo"
                    className="h-12 w-12 rounded-lg object-cover border-2 border-primary-foreground/20"
                  />
                ) : (
                  <Trophy className="h-8 w-8 text-accent" />
                )}
                {isAdmin && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="h-4 w-4 text-white" />
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
              <div>
                {isAdmin ? (
                  <>
                    <Input
                      value={tournament.name}
                      onChange={e => setTournament({ ...tournament, name: e.target.value })}
                      className="text-2xl font-bold bg-transparent border-none text-primary-foreground placeholder:text-primary-foreground/50 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Input
                      value={tournament.managerName}
                      onChange={e => setTournament({ ...tournament, managerName: e.target.value })}
                      className="text-sm bg-transparent border-none text-primary-foreground/70 placeholder:text-primary-foreground/40 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Tournament Manager"
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{tournament.name}</h1>
                    <p className="text-sm text-primary-foreground/70">{tournament.managerName}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-3 text-sm">
                <span className="stat-card bg-primary-foreground/10 border-primary-foreground/20 py-1 px-3 text-primary-foreground">
                  <span className="font-bold">{stats.teams}</span> teams
                </span>
                <span className="stat-card bg-primary-foreground/10 border-primary-foreground/20 py-1 px-3 text-primary-foreground">
                  <span className="font-bold">{stats.pools}</span> pools
                </span>
                <span className="stat-card bg-primary-foreground/10 border-primary-foreground/20 py-1 px-3 text-primary-foreground">
                  <span className="font-bold">{stats.played}/{stats.total}</span> matches
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary-foreground/70" />
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                <Moon className="h-4 w-4 text-primary-foreground/70" />
              </div>
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordSettings(!showPasswordSettings)}
                    className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-1" /> {isAdmin ? 'Admin' : 'Viewer'}
              </Button>
            </div>
          </div>

          {/* Password Settings */}
          {showPasswordSettings && isAdmin && (
            <div className="mt-4 p-3 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 max-w-sm">
              <p className="text-sm font-medium text-primary-foreground mb-2">Change Admin Password</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  className="h-8 text-sm bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40"
                />
                <Button size="sm" onClick={handleChangePassword} className="h-8 text-xs">Save</Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">
        {isAdmin ? (
          <Tabs defaultValue="teams" className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="teams" className="gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Teams</span>
              </TabsTrigger>
              <TabsTrigger value="pools" className="gap-1.5">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Pools</span>
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Fixtures</span>
              </TabsTrigger>
              <TabsTrigger value="standings" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Standings</span>
              </TabsTrigger>
              <TabsTrigger value="playoffs" className="gap-1.5">
                <Swords className="h-4 w-4" />
                <span className="hidden sm:inline">Playoffs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teams">
              <TeamManager tournament={tournament} onChange={handleChange} />
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
          <Tabs defaultValue="standings" className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="standings" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Standings</span>
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Fixtures</span>
              </TabsTrigger>
              <TabsTrigger value="playoffs" className="gap-1.5">
                <Swords className="h-4 w-4" />
                <span className="hidden sm:inline">Playoffs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standings">
              <StandingsView tournament={tournament} />
            </TabsContent>
            <TabsContent value="fixtures">
              <ViewerFixtures tournament={tournament} />
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
        <Calendar className="h-5 w-5 text-secondary" />
        <h2 className="text-xl font-bold">Fixtures</h2>
      </div>
      {tournament.pools.map(pool => {
        const poolFixtures = tournament.fixtures
          .filter(f => f.poolId === pool.id)
          .sort((a, b) => a.round - b.round);
        if (poolFixtures.length === 0) return null;
        const rounds = [...new Set(poolFixtures.map(f => f.round))].sort((a, b) => a - b);
        return (
          <div key={pool.id} className="space-y-3">
            <h3 className="font-bold text-lg">{pool.name}</h3>
            {rounds.map(round => (
              <div key={round} className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Round {round}</p>
                {poolFixtures.filter(f => f.round === round).map(fixture => (
                  <div key={fixture.id} className="stat-card flex items-center justify-between gap-2">
                    <span className="font-medium text-sm flex-1 text-right">
                      {getName(tournament, fixture.homeTeamId)}
                    </span>
                    <span className={`px-3 py-1 rounded text-sm font-mono font-bold min-w-[70px] text-center ${
                      fixture.played ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {fixture.played ? `${fixture.homeScore} - ${fixture.awayScore}` : 'vs'}
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
          <h2 className="text-xl font-bold">Playoffs</h2>
        </div>
        <p className="text-muted-foreground text-sm py-8 text-center">Playoffs not generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">Playoffs</h2>
      </div>
      <div className="flex gap-8 overflow-x-auto pb-4">
        {rounds.map(round => (
          <div key={round} className="flex-shrink-0 space-y-3 min-w-[220px]">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground text-center">
              {getRoundName(round)}
            </h3>
            <div className="space-y-4" style={{ paddingTop: `${(rounds[0] / round - 1) * 40}px` }}>
              {tournament.playoffs
                .filter(m => m.round === round)
                .sort((a, b) => a.position - b.position)
                .map(match => (
                  <div
                    key={match.id}
                    className={`rounded-lg border p-3 space-y-1 bg-card ${round === 1 ? 'ring-2 ring-accent/30' : ''}`}
                    style={{ marginBottom: `${(rounds[0] / round - 1) * 40}px` }}
                  >
                    <div className={`flex justify-between text-sm ${match.played && match.homeScore! > match.awayScore! ? 'font-bold' : ''}`}>
                      <span className="truncate">{getName(tournament, match.homeTeamId)}</span>
                      {match.played && <span className="font-mono">{match.homeScore}</span>}
                    </div>
                    <div className={`flex justify-between text-sm ${match.played && match.awayScore! > match.homeScore! ? 'font-bold' : ''}`}>
                      <span className="truncate">{getName(tournament, match.awayTeamId)}</span>
                      {match.played && <span className="font-mono">{match.awayScore}</span>}
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
