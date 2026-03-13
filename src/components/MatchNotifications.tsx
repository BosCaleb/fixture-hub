import { useEffect, useRef, useState } from 'react';
import { Tournament } from '@/lib/types';
import { getTeamName } from '@/lib/tournament-store';
import { Bell, Clock, X } from 'lucide-react';

interface Notification {
  id: string;
  fixtureId: string;
  minutesLeft: number;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  time: string;
}

interface Props {
  tournament: Tournament;
}

export function MatchNotifications({ tournament }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function checkUpcoming() {
      const now = new Date();
      const newNotifications: Notification[] = [];

      for (const fixture of tournament.fixtures) {
        if (fixture.played || !fixture.date || !fixture.time) continue;

        const matchDateTime = new Date(`${fixture.date}T${fixture.time}`);
        const diffMs = matchDateTime.getTime() - now.getTime();
        const diffMin = diffMs / 60000;

        for (const threshold of [10, 5]) {
          const key = `${fixture.id}-${threshold}`;
          if (notifiedRef.current.has(key)) continue;
          if (diffMin > 0 && diffMin <= threshold) {
            notifiedRef.current.add(key);
            newNotifications.push({
              id: key,
              fixtureId: fixture.id,
              minutesLeft: threshold,
              homeTeam: getTeamName(tournament, fixture.homeTeamId),
              awayTeam: getTeamName(tournament, fixture.awayTeamId),
              venue: fixture.venue,
              time: fixture.time,
            });
          }
        }
      }

      if (newNotifications.length > 0) {
        setNotifications((prev) => [...newNotifications, ...prev]);
      }
    }

    checkUpcoming();
    const interval = setInterval(checkUpcoming, 30000);
    return () => clearInterval(interval);
  }, [tournament]);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto bg-card border border-border rounded-lg shadow-lg p-3 animate-slide-in"
        >
          <div className="flex items-start gap-2">
            <div className={`flex-shrink-0 rounded-full p-1.5 ${n.minutesLeft <= 5 ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'}`}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {n.minutesLeft} min until kickoff
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                {n.homeTeam} vs {n.awayTeam}
              </p>
              {n.venue && (
                <p className="text-xs text-muted-foreground truncate">{n.venue} · {n.time}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
