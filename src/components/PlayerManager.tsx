import { useState, useRef } from 'react';
import { Tournament } from '@/lib/types';
import {
  addPlayer,
  removePlayer,
  updatePlayer,
  generatePlayerTemplate,
  importPlayersFromCSV,
} from '@/lib/tournament-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, UserPlus, Download, Upload, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function PlayerManager({ tournament, onChange }: Props) {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<string>('unassigned');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeamId, setEditTeamId] = useState<string>('unassigned');
  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    const resolvedTeamId = teamId === 'unassigned' ? null : teamId;
    onChange(addPlayer(tournament, name.trim(), resolvedTeamId, jerseyNumber.trim(), position.trim()));
    setName('');
    setJerseyNumber('');
    setPosition('');
    setTeamId('unassigned');
  };

  const handleDownloadTemplate = () => {
    const csv = generatePlayerTemplate(tournament);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'player-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const updated = importPlayersFromCSV(tournament, csv);
      const newCount = updated.players.length - tournament.players.length;
      onChange(updated);
      toast.success(`Imported ${newCount} player${newCount !== 1 ? 's' : ''}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (playerId: string) => {
    const player = tournament.players.find(p => p.id === playerId);
    if (!player) return;
    setEditingId(playerId);
    setEditTeamId(player.teamId || 'unassigned');
  };

  const saveEdit = (playerId: string) => {
    const resolvedTeamId = editTeamId === 'unassigned' ? null : editTeamId;
    onChange(updatePlayer(tournament, playerId, { teamId: resolvedTeamId }));
    setEditingId(null);
  };

  const filteredPlayers = filterTeamId === 'all'
    ? tournament.players
    : filterTeamId === 'unassigned'
      ? tournament.players.filter(p => !p.teamId)
      : tournament.players.filter(p => p.teamId === filterTeamId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-secondary" />
        <h2 className="text-xl font-bold">Players ({tournament.players.length})</h2>
      </div>

      {/* Add player form */}
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Player name..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="max-w-[180px]"
        />
        <Input
          placeholder="#"
          value={jerseyNumber}
          onChange={e => setJerseyNumber(e.target.value)}
          className="w-16"
        />
        <Input
          placeholder="Position"
          value={position}
          onChange={e => setPosition(e.target.value)}
          className="w-24"
        />
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">No Team</SelectItem>
            {tournament.teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Filter by team */}
      {tournament.players.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={filterTeamId} onValueChange={setFilterTeamId}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {tournament.teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            ({filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Player list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {filteredPlayers.map(player => {
          const team = player.teamId ? tournament.teams.find(t => t.id === player.teamId) : null;
          const isEditing = editingId === player.id;

          return (
            <div
              key={player.id}
              className="stat-card flex items-center justify-between animate-slide-in"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {player.jerseyNumber && (
                    <span className="text-xs font-mono font-bold bg-primary/10 text-primary rounded px-1.5 py-0.5">
                      #{player.jerseyNumber}
                    </span>
                  )}
                  <p className="font-semibold truncate">{player.name}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {player.position && (
                    <span className="text-xs bg-accent/10 text-accent-foreground rounded px-1.5 py-0.5">
                      {player.position}
                    </span>
                  )}
                  {isEditing ? (
                    <Select value={editTeamId} onValueChange={setEditTeamId}>
                      <SelectTrigger className="h-6 text-xs w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No Team</SelectItem>
                        {tournament.teams.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {team ? team.name : 'Unassigned'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => saveEdit(player.id)} className="text-primary h-7 w-7 p-0">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-7 w-7 p-0">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(player.id)} className="h-7 w-7 p-0">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange(removePlayer(tournament, player.id))}
                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tournament.players.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Add players to get started
        </p>
      )}
    </div>
  );
}
