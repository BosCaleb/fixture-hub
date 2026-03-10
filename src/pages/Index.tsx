import { useEffect, useRef, useState } from 'react';
import { Tournament, UserRole } from '@/lib/types';
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
import {
  Trophy,
  Users,
  Layers,
  Calendar,
  BarChart3,
  Swords,
  RotateCcw,
  Sun,
  Moon,
  LogOut,
  Camera,
  Monitor,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureDefaultTournament,
  fetchTournament,
  getSessionProfile,
  resetTournament,
  saveTournamentState,
  signOut,
  subscribeToAuthChanges,
  subscribeToTournamentRealtime,
  uploadTournamentLogo,
} from '@/lib/tournament-api';
import { getDefaultTournament } from '@/lib/tournament-store';

const Index = () => {
  const [tournament, setTournament] = useState<Tournament>(getDefaultTournament());
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    void bootstrap();

    const unsubscribeAuth = subscribeToAuthChanges(() => {
      void refreshRole();
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    const unsubscribeRealtime = subscribeToTournamentRealtime(tournamentId, () => {
      void refreshTournament(tournamentId, false);
    });
    return () => unsubscribeRealtime();
  }, [tournamentId]);

  async function bootstrap() {
    try {
      setLoading(true);
      const sessionInfo = await getSessionProfile();
      const id = await ensureDefaultTournament(sessionInfo.profile?.role === 'admin');

      setRole(sessionInfo.profile?.role ?? null);
      setTournamentId(id);

      if (id) {
        const remoteTournament = await fetchTournament(id);
        setTournament(remoteTournament);
      } else {
        setTournament(getDefaultTournament());
      }
    } catch (error: any) {
      console.error('Bootstrap failed:', error);
      toast.error(error?.message || 'Failed to load tournament');
      setTournament(getDefaultTournament());
    } finally {
      setLoading(false);
    }
  }

  async function refreshRole() {
    try {
      const sessionInfo = await getSessionProfile();
      setRole(sessionInfo.profile?.role ?? null);

      if (!tournamentId) {
        const id = await ensureDefaultTournament(sessionInfo.profile?.role === 'admin');
        if (id) {
          setTournamentId(id);
          const remoteTournament = await fetchTournament(id);
          setTournament(remoteTournament);
        }
      }
    } catch (error) {
      console.error('Failed to refresh role', error);
    }
  }

  async function refreshTournament(id = tournamentId, showErrors = true) {
    if (!id) return;
    try {
      const remoteTournament = await fetchTournament(id);
      setTournament(remoteTournament);
    } catch (error: any) {
      console.error('Failed to refresh tournament', error);
      if (showErrors) {
        toast.error(error?.message || 'Failed to refresh tournament');
      }
    }
  }

  async function persistTournament(nextTournament: Tournament, message?: string) {
    if (!isAdmin) {
      setTournament(nextTournament);
      return;
    }

    try {
      setSaving(true);
      setTournament(nextTournament);
      await saveTournamentState(nextTournament);
      if (!tournamentId) setTournamentId(nextTournament.id);
      if (message) toast.success(message);
    } catch (error: any) {
      console.error('Failed to save tournament', error);
      toast.error(error?.message || 'Failed to save tournament');
      if (tournamentId) {
        await refreshTournament(tournamentId, false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminAuthenticated() {
    const sessionInfo = await getSessionProfile();
    if (sessionInfo.profile?.role !== 'admin') {
      toast.error('This account is not an admin yet. Promote it in Supabase first.');
      await signOut();
      setRole(null);
      return;
    }

    setRole('admin');

    const id = await ensureDefaultTournament(true);
    if (id) {
      setTournamentId(id);
      await refreshTournament(id, false);
    }
  }

  function handleViewerAccess() {
    setRole('viewer');
  }

  async function handleLogout() {
    if (isAdmin) {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out failed', error);
      }
    }
    setRole(null);
  }

  async function handleReset() {
    if (!isAdmin || !tournamentId) return;
    const confirmed = window.confirm('Reset all tournament data? This will remove teams, players, pools, fixtures and playoffs.');
    if (!confirmed) return;

    try {
      setLoading(true);
      const fresh = await resetTournament(tournamentId);
      setTournament(fresh);
      toast.success('Tournament reset');
    } catch (error: any) {
      console.error('Reset failed', error);
      toast.error(error?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isAdmin || !tournamentId) return;

    try {
      setSaving(true);
      const logoUrl = await uploadTournamentLogo(tournamentId, file);
      const nextTournament = { ...tournament, logo: logoUrl };
      setTournament(nextTournament);
      toast.success('Logo uploaded');
    } catch (error: any) {
      console.error('Logo upload failed', error);
      toast.error(error?.message || 'Logo upload failed');
    } finally {
      setSaving(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Trophy className="h-10 w-10 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <LoginPage
        onViewerAccess={handleViewerAccess}
        onAdminAuthenticated={handleAdminAuthenticated}
      />
    );
  }

  const stats = {
    teams: tournament.teams.length,
    pools: tournament.pools.length,
    played: tournament.fixtures.filter((fixture) => fixture.played).length,
    total: tournament.fixtures.length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 gold-gradient" />
      <header className="tournament-gradient text-primary-foreground">
        <div className="container py-3 sm:py-4 px-3 sm:px-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative group flex-shrink-0">
                {tournament.logo ? (
                  <img src={tournament.logo} alt="Tournament logo" className="h-9 w-9 sm:h-12 sm:w-12 rounded object-cover border-2 border-accent/40" />
                ) : (
                  <div className="h-9 w-9 sm:h-12 sm:w-12 rounded bg-accent/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-accent" />
                  </div>
                )}
                {isAdmin && (
                  <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-background/60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-foreground" />
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              <div className="min-w-0 flex-1">
                {isAdmin ? (
                  <>
                    <Input
                      value={tournament.name}
                      onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
                      onBlur={() => void persistTournament(tournament)}
                      className="text-lg sm:text-2xl font-bold bg-transparent border-none text-primary-foreground placeholder:text-primary-foreground/50 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-display)' }}
                    />
                    <Input
                      value={tournament.managerName}
                      onChange={(e) => setTournament({ ...tournament, managerName: e.target.value })}
                      onBlur={() => void persistTournament(tournament)}
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

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground/50" />
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground/50" />
              </div>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => void handleReset()} className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 sm:h-8 px-1.5 sm:px-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">Reset</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => void handleLogout()} className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 sm:h-8 px-1.5 sm:px-2">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">{isAdmin ? 'Admin' : 'Viewer'}</span>
              </Button>
            </div>
          </div>

          <div className="flex gap-0 text-[10px] sm:text-xs mt-2 overflow-x-auto">
            <span className="bg-accent text-accent-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>{stats.teams} Teams</span>
            <span className="bg-primary-foreground/10 text-primary-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-primary-foreground/10 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>{stats.pools} Pools</span>
            <span className="bg-primary-foreground/10 text-primary-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-primary-foreground/10 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>{stats.played}/{stats.total} Played</span>
            <a href="/scoreboard" target="_blank" rel="noopener noreferrer" className="bg-accent text-accent-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-primary-foreground/10 whitespace-nowrap flex items-center gap-1 hover:bg-accent/90 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
              <Monitor className="h-3 w-3" /> Scoreboard
            </a>
            {saving && <span className="bg-primary-foreground/10 text-primary-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-primary-foreground/10 whitespace-nowrap">Saving…</span>}
          </div>
        </div>
      </header>

      <div className="h-1 gold-gradient" />

      <main className="container py-4 sm:py-6 px-3 sm:px-8">
        {isAdmin ? (
          <Tabs defaultValue="teams" className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex sm:grid sm:grid-cols-6 w-auto sm:w-full sm:max-w-3xl bg-card border rounded-none h-auto p-0">
                <TabsTrigger value="teams" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Teams
                </TabsTrigger>
                <TabsTrigger value="players" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Players
                </TabsTrigger>
                <TabsTrigger value="pools" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Pools
                </TabsTrigger>
                <TabsTrigger value="fixtures" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Fixtures
                </TabsTrigger>
                <TabsTrigger value="standings" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Standings
                </TabsTrigger>
                <TabsTrigger value="playoffs" className="gap-1 sm:gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2 sm:py-2.5 px-3 sm:px-0 uppercase tracking-wide text-[10px] sm:text-xs font-bold whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Playoffs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="teams"><TeamManager tournament={tournament} onChange={(next) => void persistTournament(next)} /></TabsContent>
            <TabsContent value="players"><PlayerManager tournament={tournament} onChange={(next) => void persistTournament(next)} /></TabsContent>
            <TabsContent value="pools"><PoolManager tournament={tournament} onChange={(next) => void persistTournament(next)} /></TabsContent>
            <TabsContent value="fixtures"><FixtureManager tournament={tournament} onChange={(next) => void persistTournament(next)} /></TabsContent>
            <TabsContent value="standings"><StandingsView tournament={tournament} /></TabsContent>
            <TabsContent value="playoffs"><PlayoffBracket tournament={tournament} onChange={(next) => void persistTournament(next)} /></TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="standings" className="space-y-4 sm:space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-md bg-card border rounded-none h-auto p-0">
              <TabsTrigger value="standings" className="gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2.5 uppercase tracking-wide text-xs font-bold"><BarChart3 className="h-4 w-4" /> Standings</TabsTrigger>
              <TabsTrigger value="fixtures" className="gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2.5 uppercase tracking-wide text-xs font-bold"><Calendar className="h-4 w-4" /> Fixtures</TabsTrigger>
              <TabsTrigger value="playoffs" className="gap-1.5 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none py-2.5 uppercase tracking-wide text-xs font-bold"><Swords className="h-4 w-4" /> Playoffs</TabsTrigger>
            </TabsList>

            <TabsContent value="standings"><StandingsView tournament={tournament} /></TabsContent>
            <TabsContent value="fixtures"><FixtureManager tournament={tournament} onChange={() => {}} readOnly /></TabsContent>
            <TabsContent value="playoffs"><PlayoffBracket tournament={tournament} onChange={() => {}} readOnly /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
