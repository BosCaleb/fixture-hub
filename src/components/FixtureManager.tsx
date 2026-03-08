import { useState, useRef } from 'react';
import { Tournament } from '@/lib/types';
import { updateScore, clearScore, getTeamName, exportFixturesToCSV, addManualFixture, generateFixtureTemplate, importFixturesFromCSV } from '@/lib/tournament-store';
import { exportFixturesPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Check, RotateCcw, Plus, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function FixtureManager({ tournament, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [manualPoolId, setManualPoolId] = useState('');
  const [manualHomeId, setManualHomeId] = useState('');
  const [manualAwayId, setManualAwayId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddManualFixture = () => {
    if (!manualPoolId || !manualHomeId || !manualAwayId || manualHomeId === manualAwayId) return;
    onChange(addManualFixture(tournament, manualPoolId, manualHomeId, manualAwayId));
    setManualHomeId('');
    setManualAwayId('');
  };

  const selectedPoolTeams = tournament.teams.filter(t => t.poolId === manualPoolId);

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

  const handleDownloadTemplate = () => {
    const csv = generateFixtureTemplate(tournament);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fixture-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const updated = importFixturesFromCSV(tournament, csv);
      const newCount = updated.fixtures.length - tournament.fixtures.length;
      onChange(updated);
      toast.success(`Imported ${newCount} fixture${newCount !== 1 ? 's' : ''}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="text-xl">Fixtures</h2>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => exportFixturesPDF(tournament)} className="uppercase tracking-wide text-xs font-bold">
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="uppercase tracking-wide text-xs font-bold">
            <Download className="h-4 w-4 mr-1" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="uppercase tracking-wide text-xs font-bold">
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Manual Fixture Creation */}
      {tournament.pools.length > 0 && (
        <div className="rounded border bg-card p-4 space-y-3 border-l-4 border-l-accent">
          <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'var(--font-display)' }}>Add Manual Fixture</h3>
          <div className="flex flex-wrap gap-2 items-end">
            <Select value={manualPoolId} onValueChange={v => { setManualPoolId(v); setManualHomeId(''); setManualAwayId(''); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Pool" />
              </SelectTrigger>
              <SelectContent>
                {tournament.pools.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={manualHomeId} onValueChange={setManualHomeId} disabled={!manualPoolId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Home team" />
              </SelectTrigger>
              <SelectContent>
                {selectedPoolTeams.filter(t => t.id !== manualAwayId).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground font-bold text-xs px-1 uppercase score-badge">vs</span>
            <Select value={manualAwayId} onValueChange={setManualAwayId} disabled={!manualPoolId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Away team" />
              </SelectTrigger>
              <SelectContent>
                {selectedPoolTeams.filter(t => t.id !== manualHomeId).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddManualFixture} disabled={!manualHomeId || !manualAwayId} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wide">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      )}

      {tournament.pools.map(pool => {
        const poolFixtures = tournament.fixtures
          .filter(f => f.poolId === pool.id)
          .sort((a, b) => a.round - b.round);

        if (poolFixtures.length === 0) return null;

        const rounds = [...new Set(poolFixtures.map(f => f.round))].sort((a, b) => a - b);

        return (
          <div key={pool.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="espn-section-header flex-1">{pool.name}</div>
              <Button variant="outline" size="sm" onClick={() => handleExport(pool.id)} className="ml-2 uppercase tracking-wide text-xs font-bold">
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>

            {rounds.map(round => (
              <div key={round} className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
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
                              type="number" min="0" value={homeScore}
                              onChange={e => setHomeScore(e.target.value)}
                              className="w-14 h-8 text-center text-sm" autoFocus
                            />
                            <span className="text-muted-foreground text-xs font-bold">-</span>
                            <Input
                              type="number" min="0" value={awayScore}
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
                            className={`px-3 py-1.5 rounded text-sm font-bold min-w-[70px] text-center transition-all score-badge ${
                              fixture.played
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {fixture.played ? `${fixture.homeScore} - ${fixture.awayScore}` : 'VS'}
                          </button>
                        )}

                        <span className="font-medium text-sm flex-1">
                          {getTeamName(tournament, fixture.awayTeamId)}
                        </span>

                        {fixture.played && !isEditing && (
                          <Button
                            variant="ghost" size="sm"
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
