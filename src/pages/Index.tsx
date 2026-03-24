import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Tournament, UserRole } from '@/lib/types';
import { TeamManager } from '@/components/TeamManager';
import { PoolManager } from '@/components/PoolManager';
import { FixtureManager } from '@/components/FixtureManager';
import { StandingsView } from '@/components/StandingsView';
import { PlayoffBracket } from '@/components/PlayoffBracket';
import { PlayerManager } from '@/components/PlayerManager';

import { MatchNotifications } from '@/components/MatchNotifications';
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
  Archive } from
'lucide-react';
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
  uploadTournamentLogo } from
'@/lib/tournament-api';
import { getDefaultTournament } from '@/lib/tournament-store';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const Index = () => {
  const { sport, tournamentId: urlTournamentId } = useParams<{ sport: string; tournamentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlRole = searchParams.get('role') as 'admin' | 'viewer' | null;

  const [tournament, setTournament] = useState<Tournament>(getDefaultTournament());
  const [tournamentId, setTournamentId] = useState<string | null>(urlTournamentId ?? null);
  const [role, setRole] = useState<UserRole | null>(urlRole);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { darkMode, setDarkMode } = useTheme();

  const logoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin';

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

      const sessionInfo = urlRole === 'admin' ? await getSessionProfile() : null;
      const resolvedRole: UserRole | null =
        urlRole === 'viewer'
          ? 'viewer'
          : sessionInfo?.profile?.role === 'admin'
            ? 'admin'
            : null;

      setRole(resolvedRole);

      const id = urlTournamentId || await ensureDefaultTournament(resolvedRole === 'admin');
      setTournamentId(id);

      if (id) {
        const remoteTournament = await fetchTournament(id);
        setTournament(remoteTournament);
      } else {
        setTournament(getDefaultTournament());
      }
    } catch (error: unknown) {
      console.error('Bootstrap failed:', error);
      toast.error(getErrorMessage(error, 'Failed to load tournament'));
      setTournament(getDefaultTournament());
    } finally {
      setLoading(false);
    }
  }

  async function refreshRole() {
    try {
      const sessionInfo = await getSessionProfile();
      const nextRole: UserRole | null = sessionInfo.profile?.role ?? (urlRole === 'viewer' ? 'viewer' : null);
      setRole(nextRole);

      if (!tournamentId) {
        const id = await ensureDefaultTournament(nextRole === 'admin');
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
    } catch (error: unknown) {
      console.error('Failed to refresh tournament', error);
      if (showErrors) {
        toast.error(getErrorMessage(error, 'Failed to refresh tournament'));
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
    } catch (error: unknown) {
      console.error('Failed to save tournament', error);
      toast.error(getErrorMessage(error, 'Failed to save tournament'));
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
    navigate('/');
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
    } catch (error: unknown) {
      console.error('Reset failed', error);
      toast.error(getErrorMessage(error, 'Reset failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!isAdmin || !tournamentId) return;
    const confirmed = window.confirm('Archive this tournament? All current data will be saved to the database.');
    if (!confirmed) return;

    try {
      setSaving(true);
      await saveTournamentState(tournament);
      toast.success('Tournament archived successfully');
    } catch (error: unknown) {
      console.error('Archive failed', error);
      toast.error(getErrorMessage(error, 'Archive failed'));
    } finally {
      setSaving(false);
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
    } catch (error: unknown) {
      console.error('Logo upload failed', error);
      toast.error(getErrorMessage(error, 'Logo upload failed'));
    } finally {
      setSaving(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  useEffect(() => {
    if (!loading && !role) {
      navigate('/');
    }
  }, [loading, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Trophy className="h-10 w-10 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>);
  }

  if (!role) {
    return null;
  }

  const stats = {
    teams: tournament.teams.length,
    pools: tournament.pools.length,
    played: tournament.fixtures.filter((fixture) => fixture.played).length,
    total: tournament.fixtures.length
  };

  return (
    <div className="min-h-screen bg-background">
      <MatchNotifications tournament={tournament} />
      <div className="h-1 gold-gradient" />
      <header className="tournament-gradient text-white">
        <div className="container py-3 sm:py-4 px-3 sm:px-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative group flex-shrink-0">
                {tournament.logo ?
                <img src={tournament.logo} alt="Tournament logo" className="h-9 w-9 sm:h-12 sm:w-12 rounded object-cover border-2 border-accent/40" /> :

                <div className="h-9 w-9 sm:h-12 sm:w-12 rounded bg-accent/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-accent" />
                  </div>
                }
                {isAdmin &&
                <button onClick={() => logoInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-background/60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-foreground" />
                  </button>
                }
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              <div className="min-w-0 flex-1">
                {isAdmin ?
                <>
                    <Input
                    value={tournament.name}
                    onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
                    onBlur={() => void persistTournament(tournament)}
                    className="text-lg sm:text-2xl font-bold bg-transparent border-none text-white placeholder:text-white/50 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-display)' }} />
                  
                    <Input
                    value={tournament.managerName}
                    onChange={(e) => setTournament({ ...tournament, managerName: e.target.value })}
                    onBlur={() => void persistTournament(tournament)}
                    className="text-[10px] sm:text-xs bg-transparent border-none text-white/60 placeholder:text-white/30 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 uppercase tracking-widest"
                    placeholder="Tournament Manager" />
                  
                  </> :

                <>
                    <h1 className="text-lg sm:text-2xl text-white tracking-wider truncate">{tournament.name}</h1>
                    <p className="text-[10px] sm:text-xs text-white/60 uppercase tracking-widest truncate">{tournament.managerName}</p>
                  </>
                }
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/50" />
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/50" />
              </div>
              {isAdmin &&
              <>
                  <Button variant="ghost" size="sm" onClick={() => void handleArchive()} className="text-white/60 hover:text-white hover:bg-white/10 h-7 sm:h-8 px-1.5 sm:px-2">
                    <Archive className="h-3.5 w-3.5 text-white" />
                    <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">Archive</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleReset()} className="text-white/60 hover:text-white hover:bg-white/10 h-7 sm:h-8 px-1.5 sm:px-2">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">Reset</span>
                  </Button>
                </>
              }
              <Button variant="ghost" size="sm" onClick={() => void handleLogout()} className="text-white/60 hover:text-white hover:bg-white/10 h-7 sm:h-8 px-1.5 sm:px-2">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1 text-xs uppercase tracking-wide">{isAdmin ? 'Admin' : 'Viewer'}</span>
              </Button>
            </div>
          </div>

          <div className="flex gap-0 text-[10px] sm:text-xs mt-2 overflow-x-auto">
            <span className="bg-accent text-accent-foreground px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>{stats.teams} Teams</span>
            <span className="bg-white/10 text-white px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-white/10 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>{stats.pools} Pools</span>
            <span className="bg-white/10 text-white px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-white/10 whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>{stats.played}/{stats.total} Played</span>
            {saving && <span className="bg-white/10 text-white px-2 sm:px-3 py-1 sm:py-1.5 font-bold uppercase tracking-wide border-l border-white/10 whitespace-nowrap">Saving…</span>}
          </div>
        </div>
      </header>

      <div className="h-1 gold-gradient" />

      <main className="container py-4 sm:py-6 px-3 sm:px-8">
        {isAdmin ?
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
          </Tabs> :

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
        }
      </main>
    </div>);

};

export default Index;