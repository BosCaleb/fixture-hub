import { useState } from 'react';
import { Shield, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp } from '@/lib/tournament-api';

interface Props {
  onViewerAccess: () => void;
  onAdminAuthenticated: () => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function LoginPage({ onViewerAccess, onAdminAuthenticated }: Props) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAdminAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      await onAdminAuthenticated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Authentication failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <p className="text-center text-muted-foreground text-sm uppercase tracking-widest font-medium">
          Select Access Level
        </p>

        <div className="space-y-3">
          <button
            onClick={onViewerAccess}
            className="w-full stat-card flex items-center gap-4 text-left cursor-pointer group">
            <div className="flex items-center justify-center w-12 h-12 rounded bg-muted/50">
              <Eye className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-base uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Viewer</p>
              <p className="text-xs text-muted-foreground">View standings, fixtures, brackets and scoreboard</p>
            </div>
          </button>

          {!showAdminForm ? (
            <button
              onClick={() => setShowAdminForm(true)}
              className="w-full stat-card flex items-center gap-4 text-left cursor-pointer group">
              <div className="flex items-center justify-center w-12 h-12 rounded tournament-gradient">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Admin</p>
                <p className="text-xs text-muted-foreground">Sign in to manage the tournament</p>
              </div>
            </button>
          ) : (
            <div className="stat-card space-y-4">
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
                onKeyDown={(e) => e.key === 'Enter' && void handleAdminAuth()}
                disabled={busy}
              />

              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">
                  New users sign up as viewers by default. Promote admins by updating their profile role to <code>admin</code>.
                </p>
              )}

              {error && <p className="text-sm text-destructive font-medium">{error}</p>}

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAdminForm(false); setError(''); setEmail(''); setPassword(''); }} disabled={busy}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={() => void handleAdminAuth()} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide">
                  {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
