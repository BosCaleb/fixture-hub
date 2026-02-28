import { useState, useEffect } from 'react';
import { Tournament } from '@/lib/types';
import { loadTournament, saveTournament, getDefaultTournament } from '@/lib/tournament-store';
import { TeamManager } from '@/components/TeamManager';
import { PoolManager } from '@/components/PoolManager';
import { FixtureManager } from '@/components/FixtureManager';
import { StandingsView } from '@/components/StandingsView';
import { PlayoffBracket } from '@/components/PlayoffBracket';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trophy, Users, Layers, Calendar, BarChart3, Swords, RotateCcw, Sun, Moon } from 'lucide-react';

const Index = () => {
  const [tournament, setTournament] = useState<Tournament>(loadTournament);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    saveTournament(tournament);
  }, [tournament]);

  const handleChange = (t: Tournament) => setTournament(t);

  const handleReset = () => {
    if (confirm('Reset all tournament data? This cannot be undone.')) {
      setTournament(getDefaultTournament());
    }
  };

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
              <Trophy className="h-8 w-8 text-accent" />
              <div>
                <Input
                  value={tournament.name}
                  onChange={e => setTournament({ ...tournament, name: e.target.value })}
                  className="text-2xl font-bold bg-transparent border-none text-primary-foreground placeholder:text-primary-foreground/50 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <p className="text-primary-foreground/70 text-sm">Tournament Manager</p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">
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
      </main>
    </div>
  );
};

export default Index;
