import { useState, useRef, useEffect, useMemo } from 'react';
import { Tournament } from '@/lib/types';
import { addTeam, removeTeam, generateTeamTemplate, importTeamsFromCSV, activeTeams } from '@/lib/tournament-store';
import { DeletedItemsBin } from '@/components/DeletedItemsBin';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Users, Download, Upload, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function TeamManager({ tournament, onChange }: Props) {
  const [name, setName] = useState('');
  const [allTeamNames, setAllTeamNames] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all unique team names from Supabase for autocomplete
  useEffect(() => {
    async function fetchTeams() {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('name')
          .order('name');
        if (!error && data) {
          const unique = [...new Set(data.map((t: { name: string }) => t.name))];
          setAllTeamNames(unique);
        }
      } catch {
        // silently fail — dropdown just won't populate
      }
    }
    fetchTeams();
  }, []);

  // Filter suggestions: exclude teams already in this tournament, match typed text
  const liveTeams = activeTeams(tournament);
  const suggestions = useMemo(() => {
    const currentNames = new Set(liveTeams.map(t => t.name.toLowerCase()));
    return allTeamNames.filter(
      n => !currentNames.has(n.toLowerCase()) && n.toLowerCase().includes(name.toLowerCase())
    );
  }, [allTeamNames, liveTeams, name]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onChange(addTeam(tournament, name.trim()));
    setName('');
    setDropdownOpen(false);
  };

  const handleSelectExisting = (teamName: string) => {
    onChange(addTeam(tournament, teamName));
    setName('');
    setDropdownOpen(false);
  };

  const handleDownloadTemplate = () => {
    const csv = generateTeamTemplate(tournament);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const updated = importTeamsFromCSV(tournament, csv);
      const newCount = updated.teams.length - tournament.teams.length;
      onChange(updated);
      toast.success(`Imported ${newCount} team${newCount !== 1 ? 's' : ''}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h2 className="text-xl">Teams ({liveTeams.length})</h2>
      </div>
      <div className="flex items-center gap-2">
        <DeletedItemsBin tournament={tournament} onChange={onChange} scope={['teams']} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <PopoverTrigger asChild>
            <div className="relative max-w-xs w-full">
              <Input
                placeholder="Team name or search existing..."
                value={name}
                onChange={e => { setName(e.target.value); setDropdownOpen(true); }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                onFocus={() => setDropdownOpen(true)}
                className="pr-8"
              />
              <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </PopoverTrigger>
          {suggestions.length > 0 && (
            <PopoverContent className="p-1 max-h-48 overflow-y-auto w-[var(--radix-popover-trigger-width)]" align="start" sideOffset={4} onOpenAutoFocus={e => e.preventDefault()}>
              {suggestions.map(teamName => (
                <button
                  key={teamName}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors truncate"
                  onClick={() => handleSelectExisting(teamName)}
                >
                  {teamName}
                </button>
              ))}
            </PopoverContent>
          )}
        </Popover>
        <Button onClick={handleAdd} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="uppercase tracking-wide text-xs font-bold">
            <Download className="h-4 w-4 mr-1" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="uppercase tracking-wide text-xs font-bold">
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {liveTeams.map(team => (
          <div
            key={team.id}
            className="stat-card flex items-center justify-between animate-slide-in"
          >
            <div>
              <p className="font-bold text-sm uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{team.name}</p>
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
