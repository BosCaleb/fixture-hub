import { useState } from 'react';
import { UserRole } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trophy, Shield, Eye, Lock } from 'lucide-react';

const ADMIN_PASSWORD_KEY = 'tournament-admin-password';

function getStoredAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin';
}

interface Props {
  onLogin: (role: UserRole) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = () => {
    const storedPassword = getStoredAdminPassword();
    if (password === storedPassword) {
      onLogin('admin');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ESPN-style top yellow bar */}
      <div className="h-1 gold-gradient" />
      
      {/* ESPN-style header */}
      <div className="tournament-gradient py-4">
        <div className="container flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-accent" />
          <h1 className="text-3xl text-primary-foreground tracking-wider">Tournament Manager</h1>
        </div>
      </div>
      <div className="h-1 gold-gradient" />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">Select Access Level</p>
          </div>

          <div className="space-y-3">
            {/* Viewer Access */}
            <button
              onClick={() => onLogin('viewer')}
              className="w-full stat-card flex items-center gap-4 text-left cursor-pointer group"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded bg-muted/50">
                <Eye className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Viewer</p>
                <p className="text-xs text-muted-foreground">View standings, fixtures & brackets</p>
              </div>
            </button>

            {/* Admin Access */}
            {!showAdminForm ? (
              <button
                onClick={() => setShowAdminForm(true)}
                className="w-full stat-card flex items-center gap-4 text-left cursor-pointer group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded tournament-gradient">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Admin</p>
                  <p className="text-xs text-muted-foreground">Full access to manage the tournament</p>
                </div>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : (
              <div className="stat-card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded tournament-gradient">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-base uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>Admin Login</p>
                    <p className="text-xs text-muted-foreground">Enter admin password</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                    autoFocus
                  />
                  {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowAdminForm(false); setPassword(''); setError(''); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAdminLogin} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide">
                    Login
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Default admin password: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">admin</code>
          </p>
        </div>
      </div>
    </div>
  );
}
