import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { addTeam, removeTeam } from '@/lib/tournament-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Users } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function TeamManager({ tournament, onChange }: Props) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onChange(addTeam(tournament, name.trim()));
    setName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-secondary" />
        <h2 className="text-xl font-bold">Teams ({tournament.teams.length})</h2>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Team name..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="max-w-xs"
        />
        <Button onClick={handleAdd} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {tournament.teams.map(team => (
          <div
            key={team.id}
            className="stat-card flex items-center justify-between animate-slide-in"
          >
            <div>
              <p className="font-semibold">{team.name}</p>
              <p className="text-xs text-muted-foreground">
                {team.poolId
                  ? tournament.pools.find(p => p.id === team.poolId)?.name || 'Assigned'
                  : 'Unassigned'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(removeTeam(tournament, team.id))}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {tournament.teams.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Add teams to get started
        </p>
      )}
    </div>
  );
}
