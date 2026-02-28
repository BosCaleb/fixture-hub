import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { addPool, removePool, assignTeamToPool, removeTeamFromPool, generateFixtures } from '@/lib/tournament-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Layers, Zap, X } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function PoolManager({ tournament, onChange }: Props) {
  const [poolName, setPoolName] = useState('');

  const handleAddPool = () => {
    if (!poolName.trim()) return;
    onChange(addPool(tournament, poolName.trim()));
    setPoolName('');
  };

  const unassignedTeams = tournament.teams.filter(t => !t.poolId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-secondary" />
        <h2 className="text-xl font-bold">Pools ({tournament.pools.length})</h2>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Pool name (e.g. Pool A)..."
          value={poolName}
          onChange={e => setPoolName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddPool()}
          className="max-w-xs"
        />
        <Button onClick={handleAddPool} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-1" /> Add Pool
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tournament.pools.map(pool => {
          const poolTeams = tournament.teams.filter(t => t.poolId === pool.id);
          return (
            <div key={pool.id} className="rounded-lg border bg-card p-4 space-y-3 animate-slide-in">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{pool.name}</h3>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onChange(generateFixtures(tournament, pool.id))}
                    disabled={poolTeams.length < 2}
                    title="Generate round-robin fixtures"
                  >
                    <Zap className="h-4 w-4 mr-1" /> Generate Fixtures
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(removePool(tournament, pool.id))}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Add team to pool */}
              {unassignedTeams.length > 0 && (
                <Select onValueChange={teamId => onChange(assignTeamToPool(tournament, teamId, pool.id))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add a team to this pool..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Pool teams list */}
              <div className="space-y-1">
                {poolTeams.map((team, i) => (
                  <div key={team.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
                    <span className="text-sm">
                      <span className="font-mono text-muted-foreground mr-2">{i + 1}.</span>
                      {team.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange(removeTeamFromPool(tournament, team.id, pool.id))}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {poolTeams.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">No teams assigned</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tournament.pools.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Create pools and assign teams to them
        </p>
      )}
    </div>
  );
}
