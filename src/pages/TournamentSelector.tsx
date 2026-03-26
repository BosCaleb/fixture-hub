import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Plus, ArrowLeft, Shield, LogOut, MoreVertical, Pencil, Archive, ArchiveRestore, Sun, Moon, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import statedgeLogo from '@/assets/statedge-logo.png';
import { supabase } from '@/lib/supabase';
import { signIn, signUp, getSessionProfile } from '@/lib/tournament-api';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TournamentSettings, getDefaultSettings } from '@/lib/tournament-settings-types';
import TournamentFormDialog from '@/components/TournamentFormDialog';
import AISetupDialog from '@/components/ai-setup/AISetupDialog';
import { Badge } from '@/components/ui/badge';

interface TournamentItem {
  id: string;
  name: string;
  manager_name: string;
  created_at: string;
  status: string;
  sport_type: string | null;
  tournament_format: string | null;
  archived_at: string | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function TournamentSelector() {
  const { sport } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Admin login state
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // Form dialog state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTournament, setEditingTournament] = useState<Partial<TournamentSettings> & { id?: string }>({});

  // AI setup dialog state
  const [showAISetup, setShowAISetup] = useState(false);

  useEffect(() => {
    void loadTournaments();
    void checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const { profile } = await getSessionProfile();
      setIsAdmin(profile?.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  }

  async function loadTournaments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, manager_name, created_at, status, sport_type, tournament_format, archived_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTournaments(data ?? []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load tournaments'));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter email and password.');
      return;
    }
    try {
      setBusy(true);
      setAuthError('');
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      const { profile } = await getSessionProfile();
      if (profile?.role !== 'admin') {
        toast.error('This account does not have admin access.');
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      setShowLogin(false);
      setEmail('');
      setPassword('');
      toast.success('Signed in as admin');
    } catch (err: unknown) {
      setAuthError(getErrorMessage(err, 'Authentication failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    toast.success('Signed out');
  }

  function openCreate() {
    setFormMode('create');
    setEditingTournament({ sport_type: sport || '' });
    setShowForm(true);
  }

  async function openEdit(t: TournamentItem) {
    try {
      const { data, error } = await supabase.from('tournaments').select('*').eq('id', t.id).single();
      if (error) throw error;
      const settings: Partial<TournamentSettings> & { id?: string } = {
        id: data.id,
        name: data.name || '',
        manager_name: data.manager_name || '',
        sport_type: data.sport_type || '',
        tournament_format: data.tournament_format || '',
        season: data.season || '',
        description: data.description || '',
        status: data.status || 'draft',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        daily_start_time: data.daily_start_time || '',
        daily_end_time: data.daily_end_time || '',
        timezone: data.timezone || '',
        match_duration: data.match_duration,
        halftime_structure: data.halftime_structure || '',
        break_time: data.break_time,
        venue_name: data.venue_name || '',
        venue_address: data.venue_address || '',
        num_courts: data.num_courts,
        court_names: data.court_names || [],
        indoor_outdoor: data.indoor_outdoor || '',
        venue_notes: data.venue_notes || '',
        num_pools: data.num_pools,
        max_teams: data.max_teams,
        teams_per_pool: data.teams_per_pool,
        points_for_win: data.points_for_win ?? 3,
        points_for_draw: data.points_for_draw ?? 1,
        points_for_loss: data.points_for_loss ?? 0,
        tiebreak_rules: data.tiebreak_rules || [],
        playoff_qualification: data.playoff_qualification || '',
        placement_rules: data.placement_rules || '',
        regulation_length: data.regulation_length,
        extra_time_allowed: data.extra_time_allowed ?? false,
        penalty_rules: data.penalty_rules || '',
        draws_allowed_pools: data.draws_allowed_pools ?? true,
        draws_allowed_playoffs: data.draws_allowed_playoffs ?? false,
        scoring_rules: data.scoring_rules || '',
        forfeit_rule: data.forfeit_rule || '',
        late_arrival_rule: data.late_arrival_rule || '',
        forfeit_score_treatment: data.forfeit_score_treatment || '',
        is_public: data.is_public ?? true,
        invite_code: data.invite_code || '',
        theme_color: data.theme_color || '',
        secondary_color: data.secondary_color || '',
        logo_path: data.logo_path || '',
        banner_path: data.banner_path || '',
        background_path: data.background_path || '',
        sponsor_names: data.sponsor_names || [],
        host_org: data.host_org || '',
        contact_person: data.contact_person || '',
        contact_details: data.contact_details || '',
        registration_open: data.registration_open ?? false,
        registration_deadline: data.registration_deadline || '',
        entry_fee: data.entry_fee || '',
        max_teams_registration: data.max_teams_registration,
        age_group: data.age_group || '',
        gender_category: data.gender_category || '',
        school_club_category: data.school_club_category || '',
        medical_contact: data.medical_contact || '',
        rules_doc: data.rules_doc || '',
        code_of_conduct: data.code_of_conduct || '',
        weather_notes: data.weather_notes || '',
        announcements: data.announcements || '',
      };
      setFormMode('edit');
      setEditingTournament(settings);
      setShowForm(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load tournament details'));
    }
  }

  async function handleFormSave(data: TournamentSettings) {
    if (formMode === 'create') {
      const id = crypto.randomUUID();
      const { error } = await supabase.from('tournaments').insert({
        id,
        name: data.name.trim(),
        manager_name: data.manager_name.trim() || 'Tournament Manager',
        is_public: data.is_public,
        points_for_win: data.points_for_win,
        points_for_draw: data.points_for_draw,
        points_for_loss: data.points_for_loss,
        sport_type: data.sport_type || null,
        tournament_format: data.tournament_format || null,
        season: data.season || null,
        description: data.description || null,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        daily_start_time: data.daily_start_time || null,
        daily_end_time: data.daily_end_time || null,
        timezone: data.timezone || null,
        match_duration: data.match_duration,
        halftime_structure: data.halftime_structure || null,
        break_time: data.break_time,
        venue_name: data.venue_name || null,
        venue_address: data.venue_address || null,
        num_courts: data.num_courts,
        court_names: data.court_names,
        indoor_outdoor: data.indoor_outdoor || null,
        venue_notes: data.venue_notes || null,
        num_pools: data.num_pools,
        max_teams: data.max_teams,
        teams_per_pool: data.teams_per_pool,
        tiebreak_rules: data.tiebreak_rules,
        playoff_qualification: data.playoff_qualification || null,
        placement_rules: data.placement_rules || null,
        regulation_length: data.regulation_length,
        extra_time_allowed: data.extra_time_allowed,
        penalty_rules: data.penalty_rules || null,
        draws_allowed_pools: data.draws_allowed_pools,
        draws_allowed_playoffs: data.draws_allowed_playoffs,
        scoring_rules: data.scoring_rules || null,
        forfeit_rule: data.forfeit_rule || null,
        late_arrival_rule: data.late_arrival_rule || null,
        forfeit_score_treatment: data.forfeit_score_treatment || null,
        invite_code: data.invite_code || null,
        theme_color: data.theme_color || null,
        secondary_color: data.secondary_color || null,
        logo_path: data.logo_path || null,
        banner_path: data.banner_path || null,
        background_path: data.background_path || null,
        sponsor_names: data.sponsor_names,
        host_org: data.host_org || null,
        contact_person: data.contact_person || null,
        contact_details: data.contact_details || null,
        registration_open: data.registration_open,
        registration_deadline: data.registration_deadline || null,
        entry_fee: data.entry_fee || null,
        max_teams_registration: data.max_teams_registration,
        age_group: data.age_group || null,
        gender_category: data.gender_category || null,
        school_club_category: data.school_club_category || null,
        medical_contact: data.medical_contact || null,
        rules_doc: data.rules_doc || null,
        code_of_conduct: data.code_of_conduct || null,
        weather_notes: data.weather_notes || null,
        announcements: data.announcements || null,
      });
      if (error) throw error;
      toast.success('Tournament created');
    } else {
      const tid = editingTournament.id;
      if (!tid) return;
      const { error } = await supabase.from('tournaments').update({
        name: data.name.trim(),
        manager_name: data.manager_name.trim() || 'Tournament Manager',
        is_public: data.is_public,
        points_for_win: data.points_for_win,
        points_for_draw: data.points_for_draw,
        points_for_loss: data.points_for_loss,
        sport_type: data.sport_type || null,
        tournament_format: data.tournament_format || null,
        season: data.season || null,
        description: data.description || null,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        daily_start_time: data.daily_start_time || null,
        daily_end_time: data.daily_end_time || null,
        timezone: data.timezone || null,
        match_duration: data.match_duration,
        halftime_structure: data.halftime_structure || null,
        break_time: data.break_time,
        venue_name: data.venue_name || null,
        venue_address: data.venue_address || null,
        num_courts: data.num_courts,
        court_names: data.court_names,
        indoor_outdoor: data.indoor_outdoor || null,
        venue_notes: data.venue_notes || null,
        num_pools: data.num_pools,
        max_teams: data.max_teams,
        teams_per_pool: data.teams_per_pool,
        tiebreak_rules: data.tiebreak_rules,
        playoff_qualification: data.playoff_qualification || null,
        placement_rules: data.placement_rules || null,
        regulation_length: data.regulation_length,
        extra_time_allowed: data.extra_time_allowed,
        penalty_rules: data.penalty_rules || null,
        draws_allowed_pools: data.draws_allowed_pools,
        draws_allowed_playoffs: data.draws_allowed_playoffs,
        scoring_rules: data.scoring_rules || null,
        forfeit_rule: data.forfeit_rule || null,
        late_arrival_rule: data.late_arrival_rule || null,
        forfeit_score_treatment: data.forfeit_score_treatment || null,
        invite_code: data.invite_code || null,
        theme_color: data.theme_color || null,
        secondary_color: data.secondary_color || null,
        logo_path: data.logo_path || null,
        banner_path: data.banner_path || null,
        background_path: data.background_path || null,
        sponsor_names: data.sponsor_names,
        host_org: data.host_org || null,
        contact_person: data.contact_person || null,
        contact_details: data.contact_details || null,
        registration_open: data.registration_open,
        registration_deadline: data.registration_deadline || null,
        entry_fee: data.entry_fee || null,
        max_teams_registration: data.max_teams_registration,
        age_group: data.age_group || null,
        gender_category: data.gender_category || null,
        school_club_category: data.school_club_category || null,
        medical_contact: data.medical_contact || null,
        rules_doc: data.rules_doc || null,
        code_of_conduct: data.code_of_conduct || null,
        weather_notes: data.weather_notes || null,
        announcements: data.announcements || null,
      }).eq('id', tid);
      if (error) throw error;
      toast.success('Tournament updated');
    }
    await loadTournaments();
  }

  async function handleArchive(t: TournamentItem) {
    const isArchived = !!t.archived_at;
    const confirmed = window.confirm(
      isArchived
        ? `Restore "${t.name}" from archive?`
        : `Archive "${t.name}"? It will be hidden from the main list.`
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ archived_at: isArchived ? null : new Date().toISOString() })
        .eq('id', t.id);
      if (error) throw error;
      toast.success(isArchived ? 'Tournament restored' : 'Tournament archived');
      await loadTournaments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update tournament'));
    }
  }

  function selectTournament(id: string) {
    navigate(`/${sport}/tournament/${id}`);
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    open: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    active: 'bg-green-500/15 text-green-600 dark:text-green-400',
    completed: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  };

  const visibleTournaments = tournaments.filter((t) =>
    showArchived ? !!t.archived_at : !t.archived_at
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-1 gold-gradient" />
      <div className="tournament-gradient py-4">
        <div className="container flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img src={statedgeLogo} alt="StatEdge Logo" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <h1 className="text-2xl tracking-wider text-white capitalize">{sport} Tournaments</h1>
              <p className="text-xs tracking-widest uppercase text-white/80">Powered by StatEdge</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              <Sun className="h-3.5 w-3.5 text-white/50" />
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              <Moon className="h-3.5 w-3.5 text-white/50" />
            </div>
            {isAdmin ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAISetup(true)}
                  className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                    AI Setup
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openCreate}
                  className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                    New Tournament
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`text-white/60 hover:text-white hover:bg-white/10 gap-1.5 ${showArchived ? 'bg-white/10' : ''}`}
                >
                  <Archive className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                    {showArchived ? 'Active' : 'Archived'}
                  </span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/60 hover:text-white hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogin(true)}
                className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <Shield className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                  Admin
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="h-1 gold-gradient" />

      {/* Content */}
      <div className="flex-1 container py-8 px-4">
        {showArchived && (
          <div className="mb-4 flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium" style={{ fontFamily: 'var(--font-display)' }}>
              Archived Tournaments
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Trophy className="h-10 w-10 text-primary animate-pulse" />
          </div>
        ) : visibleTournaments.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm uppercase tracking-widest">
              {showArchived ? 'No archived tournaments' : 'No tournaments yet'}
            </p>
            {isAdmin && !showArchived && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                <Button onClick={() => setShowAISetup(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Sparkles className="h-4 w-4" /> Create with AI
                </Button>
                <Button variant="outline" onClick={openCreate} className="font-bold uppercase tracking-wide gap-2 text-xs" style={{ fontFamily: 'var(--font-display)' }}>
                  <Plus className="h-4 w-4" /> Create Manually
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTournaments.map((t, i) => (
              <div
                key={t.id}
                className="group stat-card text-left animate-slide-in relative"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
              >
                <button
                  onClick={() => selectTournament(t.id)}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded tournament-gradient flex-shrink-0 group-hover:shadow-[0_0_20px_hsl(48_100%_50%/0.2)] transition-shadow duration-300">
                      <Trophy className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <p
                        className="font-bold text-base uppercase tracking-wide text-foreground group-hover:text-accent transition-colors duration-300 truncate"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{t.manager_name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[t.status] || statusColors.draft}`}>
                          {t.status || 'draft'}
                        </Badge>
                        {t.tournament_format && (
                          <span className="text-[10px] text-muted-foreground/60 capitalize">
                            {t.tournament_format.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void openEdit(t)} className="gap-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleArchive(t)} className="gap-2 text-xs">
                          {t.archived_at ? (
                            <><ArchiveRestore className="h-3.5 w-3.5" /> Restore</>
                          ) : (
                            <><Archive className="h-3.5 w-3.5" /> Archive</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Login Dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Admin Login
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={mode === 'signin' ? 'default' : 'outline'} size="sm" onClick={() => setMode('signin')}>
                Sign in
              </Button>
              <Button type="button" variant={mode === 'signup' ? 'default' : 'outline'} size="sm" onClick={() => setMode('signup')}>
                Sign up
              </Button>
            </div>
            <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
              disabled={busy}
            />
            {authError && <p className="text-sm text-destructive font-medium">{authError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLogin(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleLogin()}
                disabled={busy}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide"
              >
                {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tournament Form Dialog */}
      <TournamentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        initialData={editingTournament}
        onSave={handleFormSave}
        mode={formMode}
        sport={sport}
        tournamentId={editingTournament.id}
      />

      {/* AI Setup Dialog */}
      <AISetupDialog
        open={showAISetup}
        onOpenChange={setShowAISetup}
        sport={sport}
        onTournamentCreated={() => void loadTournaments()}
        onSwitchToManual={() => {
          setShowAISetup(false);
          openCreate();
        }}
      />
    </div>
  );
}
