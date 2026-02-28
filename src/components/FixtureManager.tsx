import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { updateScore, clearScore, getTeamName, exportFixturesToCSV } from '@/lib/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Download, Check, RotateCcw } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function FixtureManager({ tournament, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const handleSaveScore = (fixtureId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    onChange(updateScore(tournament, fixtureId, h, a));
    setEditingId(null);
    setHomeScore('');
    setAwayScore('');
  };

  const handleExport = (poolId: string) => {
    const csv = exportFixturesToCSV(tournament, poolId);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const pool = tournament.pools.find(p => p.id === poolId);
    a.href = url;
    a.download = `${pool?.name || 'fixtures'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{pool.name}</h3>
              <Button variant="outline" size="sm" onClick={() => handleExport(pool.id)}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>

            {rounds.map(round => (
              <div key={round} className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Round {round}
                </p>
                {poolFixtures
                  .filter(f => f.round === round)
                  .map(fixture => {
                    const isEditing = editingId === fixture.id;
                    return (
                      <div
                        key={fixture.id}
                        className="stat-card flex items-center justify-between gap-2 animate-slide-in"
                      >
                        <span className="font-medium text-sm flex-1 text-right">
                          {getTeamName(tournament, fixture.homeTeamId)}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={homeScore}
                              onChange={e => setHomeScore(e.target.value)}
                              className="w-14 h-8 text-center text-sm"
                              autoFocus
                            />
                            <span className="text-muted-foreground text-xs">-</span>
                            <Input
                              type="number"
                              min="0"
                              value={awayScore}
                              onChange={e => setAwayScore(e.target.value)}
                              className="w-14 h-8 text-center text-sm"
                              onKeyDown={e => e.key === 'Enter' && handleSaveScore(fixture.id)}
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success" onClick={() => handleSaveScore(fixture.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(fixture.id);
                              setHomeScore(fixture.homeScore?.toString() || '');
                              setAwayScore(fixture.awayScore?.toString() || '');
                            }}
                            className={`px-3 py-1 rounded text-sm font-mono font-bold min-w-[70px] text-center transition-all ${
                              fixture.played
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {fixture.played ? `${fixture.homeScore} - ${fixture.awayScore}` : 'vs'}
                          </button>
                        )}

                        <span className="font-medium text-sm flex-1">
                          {getTeamName(tournament, fixture.awayTeamId)}
                        </span>

                        {fixture.played && !isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground"
                            onClick={() => onChange(clearScore(tournament, fixture.id))}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        );
      })}

      {tournament.fixtures.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Generate fixtures from the Pools tab first
        </p>
      )}
    </div>
  );
}
