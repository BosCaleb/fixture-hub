import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Plus, ArrowLeft, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import statedgeLogo from '@/assets/statedge-logo.png';
import { supabase } from '@/lib/supabase';
import { signIn, signUp, getSessionProfile } from '@/lib/tournament-api';
import { toast } from 'sonner';

interface TournamentItem {
  id: string;
  name: string;
  manager_name: string;
  created_at: string;
}

export default function TournamentSelector() {
  const { sport } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin login state
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // Create tournament state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newManager, setNewManager] = useState('');
  const [creating, setCreating] = useState(false);

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
        .select('id, name, manager_name, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTournaments(data ?? []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load tournaments');
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
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    toast.success('Signed out');
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const id = crypto.randomUUID();
      const { error } = await supabase.from('tournaments').insert({
        id,
        name: newName.trim(),
        manager_name: newManager.trim() || 'Tournament Manager',
        is_public: true,
        points_for_win: 3,
        points_for_draw: 1,
        points_for_loss: 0,
      });
      if (error) throw error;
      toast.success('Tournament created');
      setShowCreate(false);
      setNewName('');
      setNewManager('');
      await loadTournaments();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  }

  function selectTournament(id: string) {
    navigate(`/${sport}/tournament/${id}`);
  }

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
            {isAdmin ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreate(true)}
                  className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                    New Tournament
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Trophy className="h-10 w-10 text-primary animate-pulse" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm uppercase tracking-widest">No tournaments yet</p>
            {isAdmin && (
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                <Plus className="h-4 w-4 mr-2" /> Create Tournament
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t, i) => (
              <button
                key={t.id}
                onClick={() => selectTournament(t.id)}
                className="group stat-card text-left cursor-pointer animate-slide-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded tournament-gradient flex-shrink-0 group-hover:shadow-[0_0_20px_hsl(48_100%_50%/0.2)] transition-shadow duration-300">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-bold text-base uppercase tracking-wide text-foreground group-hover:text-accent transition-colors duration-300 truncate"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{t.manager_name}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
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

      {/* Create Tournament Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              Create Tournament
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Tournament Name" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={creating} />
            <Input placeholder="Manager Name (optional)" value={newManager} onChange={(e) => setNewManager(e.target.value)} disabled={creating} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide"
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
