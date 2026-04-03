import { useState } from 'react';
import { Tournament } from '@/lib/types';
import { generatePlayoffs, updatePlayoffScore, clearPlayoffScore, getTeamName } from '@/lib/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Swords, Zap, Check, RotateCcw, Calendar, Clock, MapPin, Pencil } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
  readOnly?: boolean;
}

export function PlayoffBracket({ tournament, onChange, readOnly = false }: Props) {
  const [teamsPerPool, setTeamsPerPool] = useState(2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedVenue, setSchedVenue] = useState('');
  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const [editHome, setEditHome] = useState<string>('');
  const [editAway, setEditAway] = useState<string>('');

  const allTeamIds = tournament.teams.map(t => t.id);

  const handleGenerate = () => {
    if (readOnly) return;
    onChange(generatePlayoffs(tournament, teamsPerPool));
  };

  const handleSaveScore = (matchId: string) => {
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (readOnly || Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0 || h === a) return;
    onChange(updatePlayoffScore(tournament, matchId, h, a));
    setEditingId(null);
    setHomeScore('');
    setAwayScore('');
  };

  const handleClearScore = (matchId: string) => {
    if (readOnly) return;
    onChange(clearPlayoffScore(tournament, matchId));
  };

  const rounds = [...new Set(tournament.playoffs.map((m) => m.round))].sort((a, b) => b - a);

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
              onChange={(e) => setTeamsPerPool(parseInt(e.target.value, 10) || 2)}
              className="w-20 h-8"
              disabled={readOnly}
            />
            {!readOnly && (
              <Button
                onClick={handleGenerate}
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={tournament.pools.length === 0}
              >
                <Zap className="h-4 w-4 mr-1" /> Generate
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => onChange({ ...tournament, playoffs: [] })}>
              Reset Bracket
            </Button>
          )}

          <div className="flex gap-8 overflow-x-auto pb-4">
            {rounds.map((round) => (
              <div key={round} className="flex-shrink-0 space-y-3 min-w-[220px]">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground text-center">
                  {getRoundName(round)}
                </h3>
                <div className="space-y-4" style={{ paddingTop: `${(rounds[0] / round - 1) * 40}px` }}>
                  {tournament.playoffs
                    .filter((m) => m.round === round)
                    .sort((a, b) => a.position - b.position)
                    .map((match) => {
                      const isEditing = editingId === match.id;
                      const canEdit = Boolean(match.homeTeamId && match.awayTeamId);

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
                                <Input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className="w-12 h-6 text-center text-xs" autoFocus />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs flex-1 truncate">{getTeamName(tournament, match.awayTeamId)}</span>
                                <Input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className="w-12 h-6 text-center text-xs" onKeyDown={(e) => e.key === 'Enter' && handleSaveScore(match.id)} />
                              </div>
                              <Button size="sm" className="w-full h-6 text-xs" onClick={() => handleSaveScore(match.id)}>
                                <Check className="h-3 w-3 mr-1" /> Save (no draws)
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                className="w-full text-left space-y-1"
                                onClick={() => {
                                  if (!canEdit || readOnly) return;
                                  setEditingId(match.id);
                                  setHomeScore(match.homeScore?.toString() || '');
                                  setAwayScore(match.awayScore?.toString() || '');
                                }}
                                disabled={!canEdit || readOnly}
                              >
                                <div className={`flex justify-between text-sm ${match.played && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'font-bold' : ''}`}>
                                  <span className="truncate">{getTeamName(tournament, match.homeTeamId)}</span>
                                  {match.played && <span className="font-mono">{match.homeScore}</span>}
                                </div>
                                <div className={`flex justify-between text-sm ${match.played && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'font-bold' : ''}`}>
                                  <span className="truncate">{getTeamName(tournament, match.awayTeamId)}</span>
                                  {match.played && <span className="font-mono">{match.awayScore}</span>}
                                </div>
                              </button>
                              {!readOnly && match.played && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-1 -right-1 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleClearScore(match.id)}
                                  title="Clear score & reset"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Schedule info display */}
                          {(match.date || match.time || match.venue) && schedulingId !== match.id && (
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground border-t pt-1">
                              {match.date && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{match.date}</span>}
                              {match.time && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{match.time}</span>}
                              {match.venue && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{match.venue}</span>}
                            </div>
                          )}

                          {/* Schedule edit button */}
                          {!readOnly && !isEditing && schedulingId !== match.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-5 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSchedulingId(match.id);
                                setSchedDate(match.date || '');
                                setSchedTime(match.time || '');
                                setSchedVenue(match.venue || '');
                              }}
                            >
                              <Calendar className="h-2.5 w-2.5 mr-1" /> Schedule
                            </Button>
                          )}

                          {/* Schedule edit form */}
                          {!readOnly && schedulingId === match.id && (
                            <div className="space-y-1 border-t pt-2">
                              <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="h-6 text-xs" />
                              <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="h-6 text-xs" />
                              <Input placeholder="Venue / Court" value={schedVenue} onChange={(e) => setSchedVenue(e.target.value)} className="h-6 text-xs" />
                              <div className="flex gap-1">
                                <Button size="sm" className="flex-1 h-6 text-xs" onClick={() => {
                                  const playoffs = tournament.playoffs.map(m =>
                                    m.id === match.id ? { ...m, date: schedDate || null, time: schedTime || null, venue: schedVenue || null } : m
                                  );
                                  onChange({ ...tournament, playoffs });
                                  setSchedulingId(null);
                                }}>
                                  <Check className="h-2.5 w-2.5 mr-1" /> Save
                                </Button>
                                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setSchedulingId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
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
