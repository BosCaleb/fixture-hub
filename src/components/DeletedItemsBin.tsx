import { useState } from 'react';
import { Tournament } from '@/lib/types';
import {
  deletedTeams,
  deletedPools,
  deletedFixtures,
  deletedPlayers,
  deletedPlayoffs,
  restoreTeam,
  restorePool,
  restoreFixture,
  restorePlayer,
  restorePlayoffMatch,
  getTeamName,
} from '@/lib/tournament-store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
  scope?: ('teams' | 'pools' | 'fixtures' | 'players' | 'playoffs')[];
}

export function DeletedItemsBin({ tournament, onChange, scope }: Props) {
  const [open, setOpen] = useState(false);

  const showTeams = !scope || scope.includes('teams');
  const showPools = !scope || scope.includes('pools');
  const showFixtures = !scope || scope.includes('fixtures');
  const showPlayers = !scope || scope.includes('players');
  const showPlayoffs = !scope || scope.includes('playoffs');

  const dTeams = showTeams ? deletedTeams(tournament) : [];
  const dPools = showPools ? deletedPools(tournament) : [];
  const dFixtures = showFixtures ? deletedFixtures(tournament) : [];
  const dPlayers = showPlayers ? deletedPlayers(tournament) : [];
  const dPlayoffs = showPlayoffs ? deletedPlayoffs(tournament) : [];

  const totalDeleted = dTeams.length + dPools.length + dFixtures.length + dPlayers.length + dPlayoffs.length;

  if (totalDeleted === 0) return null;

  const handlePermanentDelete = (type: string, id: string) => {
    let updated = { ...tournament };
    switch (type) {
      case 'team':
        updated = { ...updated, teams: updated.teams.filter(t => t.id !== id) };
        break;
      case 'pool':
        updated = { ...updated, pools: updated.pools.filter(p => p.id !== id) };
        break;
      case 'fixture':
        updated = { ...updated, fixtures: updated.fixtures.filter(f => f.id !== id) };
        break;
      case 'player':
        updated = { ...updated, players: updated.players.filter(p => p.id !== id) };
        break;
      case 'playoff':
        updated = { ...updated, playoffs: updated.playoffs.filter(m => m.id !== id) };
        break;
    }
    onChange(updated);
    toast.success('Permanently removed');
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-destructive uppercase tracking-wide text-[10px] sm:text-xs font-bold h-7 sm:h-8 px-2 sm:px-3"
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Bin ({totalDeleted})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deleted Items</DialogTitle>
            <DialogDescription>
              These items have been removed but can be restored. They will be permanently deleted when you save.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dTeams.length > 0 && (
              <Section title="Teams">
                {dTeams.map(t => (
                  <DeletedRow key={t.id} label={t.name}
                    onRestore={() => { onChange(restoreTeam(tournament, t.id)); toast.success(`${t.name} restored`); }}
                    onDelete={() => handlePermanentDelete('team', t.id)} />
                ))}
              </Section>
            )}

            {dPools.length > 0 && (
              <Section title="Pools">
                {dPools.map(p => (
                  <DeletedRow key={p.id} label={p.name}
                    onRestore={() => { onChange(restorePool(tournament, p.id)); toast.success(`${p.name} restored`); }}
                    onDelete={() => handlePermanentDelete('pool', p.id)} />
                ))}
              </Section>
            )}

            {dFixtures.length > 0 && (
              <Section title="Fixtures">
                {dFixtures.map(f => (
                  <DeletedRow key={f.id}
                    label={`${getTeamName(tournament, f.homeTeamId)} vs ${getTeamName(tournament, f.awayTeamId)} (R${f.round})`}
                    onRestore={() => { onChange(restoreFixture(tournament, f.id)); toast.success('Fixture restored'); }}
                    onDelete={() => handlePermanentDelete('fixture', f.id)} />
                ))}
              </Section>
            )}

            {dPlayers.length > 0 && (
              <Section title="Players">
                {dPlayers.map(p => (
                  <DeletedRow key={p.id} label={`${p.name} (#${p.jerseyNumber})`}
                    onRestore={() => { onChange(restorePlayer(tournament, p.id)); toast.success(`${p.name} restored`); }}
                    onDelete={() => handlePermanentDelete('player', p.id)} />
                ))}
              </Section>
            )}

            {dPlayoffs.length > 0 && (
              <Section title="Playoff Matches">
                {dPlayoffs.map(m => (
                  <DeletedRow key={m.id}
                    label={`${getTeamName(tournament, m.homeTeamId)} vs ${getTeamName(tournament, m.awayTeamId)}`}
                    onRestore={() => { onChange(restorePlayoffMatch(tournament, m.id)); toast.success('Match restored'); }}
                    onDelete={() => handlePermanentDelete('playoff', m.id)} />
                ))}
              </Section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DeletedRow({ label, onRestore, onDelete }: { label: string; onRestore: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border px-3 py-2 bg-muted/30">
      <span className="text-sm line-through text-muted-foreground truncate">{label}</span>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRestore}>
          <RotateCcw className="h-3 w-3 mr-1" /> Restore
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
