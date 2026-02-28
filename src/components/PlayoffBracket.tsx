import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { generatePlayoffs, updatePlayoffScore, getTeamName } from '@/lib/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Swords, Zap, Check } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
}

export function PlayoffBracket({ tournament, onChange }: Props) {
  const [teamsPerPool, setTeamsPerPool] = useState(2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const handleGenerate = () => {
    onChange(generatePlayoffs(tournament, teamsPerPool));
  };

  const handleSaveScore = (matchId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h === a) return; // no draws in playoffs
    onChange(updatePlayoffScore(tournament, matchId, h, a));
    setEditingId(null);
  };

  const rounds = [...new Set(tournament.playoffs.map(m => m.round))].sort((a, b) => b - a);

  const getRoundName = (round: number): string => {
    if (round === 1) return 'Final';
    if (round === 2) return 'Semi-Finals';
    if (round === 4) return 'Quarter-Finals';
    return `Round of ${round * 2}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">Playoffs</h2>
      </div>

      {tournament.playoffs.length === 0 ? (
        <div className="stat-card text-center space-y-4 py-8">
          <p className="text-muted-foreground">Generate playoff bracket from pool standings</p>
          <div className="flex items-center justify-center gap-3">
            <label className="text-sm font-medium">Top teams per pool:</label>
            <Input
              type="number"
              min={1}
              max={8}
              value={teamsPerPool}
              onChange={e => setTeamsPerPool(parseInt(e.target.value) || 2)}
              className="w-20 h-8"
            />
            <Button
              onClick={handleGenerate}
              size="sm"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={tournament.pools.length === 0}
            >
              <Zap className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...tournament, playoffs: [] })}
          >
            Reset Bracket
          </Button>

          <div className="flex gap-8 overflow-x-auto pb-4">
            {rounds.map(round => (
              <div key={round} className="flex-shrink-0 space-y-3 min-w-[220px]">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground text-center">
                  {getRoundName(round)}
                </h3>
                <div className="space-y-4" style={{ paddingTop: `${(rounds[0] / round - 1) * 40}px` }}>
                  {tournament.playoffs
                    .filter(m => m.round === round)
                    .sort((a, b) => a.position - b.position)
                    .map(match => {
                      const isEditing = editingId === match.id;
                      const canEdit = match.homeTeamId && match.awayTeamId;

                      return (
                        <div
                          key={match.id}
                          className={`rounded-lg border p-3 space-y-2 animate-slide-in ${
                            match.played ? 'bg-card border-secondary/30' : 'bg-card'
                          } ${round === 1 ? 'ring-2 ring-accent/30' : ''}`}
                          style={{ marginBottom: `${(rounds[0] / round - 1) * 40}px` }}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs flex-1 truncate">{getTeamName(tournament, match.homeTeamId)}</span>
                                <Input
                                  type="number" min="0" value={homeScore}
                                  onChange={e => setHomeScore(e.target.value)}
                                  className="w-12 h-6 text-center text-xs" autoFocus
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs flex-1 truncate">{getTeamName(tournament, match.awayTeamId)}</span>
                                <Input
                                  type="number" min="0" value={awayScore}
                                  onChange={e => setAwayScore(e.target.value)}
                                  className="w-12 h-6 text-center text-xs"
                                  onKeyDown={e => e.key === 'Enter' && handleSaveScore(match.id)}
                                />
                              </div>
                              <Button size="sm" className="w-full h-6 text-xs" onClick={() => handleSaveScore(match.id)}>
                                <Check className="h-3 w-3 mr-1" /> Save (no draws)
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="w-full text-left space-y-1"
                              onClick={() => {
                                if (!canEdit) return;
                                setEditingId(match.id);
                                setHomeScore(match.homeScore?.toString() || '');
                                setAwayScore(match.awayScore?.toString() || '');
                              }}
                              disabled={!canEdit}
                            >
                              <div className={`flex justify-between text-sm ${
                                match.played && match.homeScore! > match.awayScore! ? 'font-bold' : ''
                              }`}>
                                <span className="truncate">{getTeamName(tournament, match.homeTeamId)}</span>
                                {match.played && <span className="font-mono">{match.homeScore}</span>}
                              </div>
                              <div className={`flex justify-between text-sm ${
                                match.played && match.awayScore! > match.homeScore! ? 'font-bold' : ''
                              }`}>
                                <span className="truncate">{getTeamName(tournament, match.awayTeamId)}</span>
                                {match.played && <span className="font-mono">{match.awayScore}</span>}
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
