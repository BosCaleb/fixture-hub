import { useState } from 'react';
import { Tournament, PlayoffMatch, PlayoffFlow } from '@/lib/types';
import { generatePlayoffs, updatePlayoffScore, clearPlayoffScore, getTeamName, activePlayoffs } from '@/lib/tournament-store';
import { DeletedItemsBin } from '@/components/DeletedItemsBin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Swords, Zap, Check, RotateCcw, Calendar, Clock, MapPin, Pencil, Trash2, Plus, Trophy, Medal, Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

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

  // Round name editing
  const [editingRoundName, setEditingRoundName] = useState<number | null>(null);
  const [roundNameInput, setRoundNameInput] = useState('');

  // Add match dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addRound, setAddRound] = useState('');
  const [addPosition, setAddPosition] = useState('');
  const [addHome, setAddHome] = useState('__none__');
  const [addAway, setAddAway] = useState('__none__');

  // 3rd place match score editing
  const [editingThirdPlace, setEditingThirdPlace] = useState(false);
  const [thirdHomeScore, setThirdHomeScore] = useState('');
  const [thirdAwayScore, setThirdAwayScore] = useState('');

  // Custom bracket builder
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customRounds, setCustomRounds] = useState<{ name: string; matchCount: number; teams: { home: string; away: string }[] }[]>([]);
  const [customTemplate, setCustomTemplate] = useState<string>('4');

  // Additional playoff flows
  const [showAddFlowDialog, setShowAddFlowDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowTeams, setNewFlowTeams] = useState<{ home: string; away: string }[]>([{ home: '__none__', away: '__none__' }]);
  const [editingFlowMatchId, setEditingFlowMatchId] = useState<string | null>(null);
  const [flowHomeScore, setFlowHomeScore] = useState('');
  const [flowAwayScore, setFlowAwayScore] = useState('');
  const [editFlowTeamMatchId, setEditFlowTeamMatchId] = useState<string | null>(null);
  const [editFlowHome, setEditFlowHome] = useState('');
  const [editFlowAway, setEditFlowAway] = useState('');

  const allTeamIds = tournament.teams.map(t => t.id);
  const livePlayoffs = activePlayoffs(tournament);
  const rounds = [...new Set(livePlayoffs.map((m) => m.round))].sort((a, b) => b - a);

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

  const handleDeleteMatch = (matchId: string) => {
    onChange({ ...tournament, playoffs: tournament.playoffs.map(m => m.id === matchId ? { ...m, isDeleted: true } : m) });
  };

  const handleAddMatch = () => {
    const round = parseInt(addRound, 10);
    const position = parseInt(addPosition, 10);
    if (Number.isNaN(round) || round < 1 || Number.isNaN(position) || position < 0) return;
    const newMatch: PlayoffMatch = {
      id: crypto.randomUUID(),
      round,
      position,
      homeTeamId: addHome === '__none__' ? null : addHome,
      awayTeamId: addAway === '__none__' ? null : addAway,
      homeScore: null,
      awayScore: null,
      played: false,
      date: null,
      time: null,
      venue: null,
    };
    onChange({ ...tournament, playoffs: [...tournament.playoffs, newMatch] });
    setShowAddDialog(false);
    setAddRound('');
    setAddPosition('');
    setAddHome('__none__');
    setAddAway('__none__');
  };

  const initCustomRounds = (teamCount: number) => {
    const rounds: typeof customRounds = [];
    let matchesInRound = teamCount / 2;
    let roundNum = matchesInRound;
    while (roundNum >= 1) {
      const defaultName = roundNum === 1 ? 'Final' : roundNum === 2 ? 'Semi-Finals' : roundNum === 4 ? 'Quarter-Finals' : `Round of ${roundNum * 2}`;
      rounds.push({
        name: defaultName,
        matchCount: matchesInRound,
        teams: Array.from({ length: matchesInRound }, () => ({ home: '__none__', away: '__none__' })),
      });
      matchesInRound = Math.floor(matchesInRound / 2);
      roundNum = Math.floor(roundNum / 2);
    }
    setCustomRounds(rounds);
  };

  const handleOpenCustomDialog = () => {
    setCustomTemplate('4');
    initCustomRounds(4);
    setShowCustomDialog(true);
  };

  const handleApplyCustomBracket = () => {
    const playoffs: PlayoffMatch[] = [];
    // Rounds are stored largest-first in customRounds
    customRounds.forEach((round, idx) => {
      // Calculate round number: first entry is the largest round
      const roundNumber = customRounds[0].matchCount / Math.pow(2, idx) >= 1
        ? customRounds[0].matchCount / Math.pow(2, idx)
        : 1;
      // More reliable: compute from matchCount
      const rn = round.matchCount;
      const actualRoundNum = rn; // matchCount equals round number in our convention
      for (let pos = 0; pos < round.matchCount; pos++) {
        const teamPair = round.teams[pos] || { home: '__none__', away: '__none__' };
        playoffs.push({
          id: crypto.randomUUID(),
          round: actualRoundNum,
          position: pos,
          homeTeamId: teamPair.home === '__none__' ? null : teamPair.home,
          awayTeamId: teamPair.away === '__none__' ? null : teamPair.away,
          homeScore: null,
          awayScore: null,
          played: false,
          date: null,
          time: null,
          venue: null,
        });
      }
    });

    // Set custom round names
    const playoffRoundNames: Record<number, string> = {};
    customRounds.forEach(round => {
      const defaultName = round.matchCount === 1 ? 'Final' : round.matchCount === 2 ? 'Semi-Finals' : round.matchCount === 4 ? 'Quarter-Finals' : `Round of ${round.matchCount * 2}`;
      if (round.name && round.name !== defaultName) {
        playoffRoundNames[round.matchCount] = round.name;
      }
    });

    onChange({ ...tournament, playoffs, playoffRoundNames, thirdPlaceMatch: null });
    setShowCustomDialog(false);
  };

  const getRoundName = (round: number): string => {
    // Use custom name if set
    if (tournament.playoffRoundNames?.[round]) return tournament.playoffRoundNames[round];
    if (round === 1) return 'Final';
    if (round === 2) return 'Semi-Finals';
    if (round === 4) return 'Quarter-Finals';
    return `Round of ${round * 2}`;
  };

  const handleSaveRoundName = (round: number) => {
    const playoffRoundNames = { ...(tournament.playoffRoundNames || {}), [round]: roundNameInput.trim() || undefined };
    // Remove empty entries
    if (!roundNameInput.trim()) delete playoffRoundNames[round];
    onChange({ ...tournament, playoffRoundNames });
    setEditingRoundName(null);
  };

  // 3rd place match helpers
  const handleGenerateThirdPlace = () => {
    // Find the two semi-final losers
    const semis = tournament.playoffs.filter(m => m.round === 2 && m.played);
    if (semis.length < 2) return;
    const losers = semis.map(m => (m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.awayTeamId : m.homeTeamId);
    const thirdPlaceMatch: PlayoffMatch = {
      id: crypto.randomUUID(),
      round: 0, // special round for 3rd place
      position: 0,
      homeTeamId: losers[0],
      awayTeamId: losers[1],
      homeScore: null,
      awayScore: null,
      played: false,
      date: null,
      time: null,
      venue: null,
    };
    onChange({ ...tournament, thirdPlaceMatch });
  };

  const handleSaveThirdPlaceScore = () => {
    const h = parseInt(thirdHomeScore, 10);
    const a = parseInt(thirdAwayScore, 10);
    if (!tournament.thirdPlaceMatch || Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0 || h === a) return;
    onChange({
      ...tournament,
      thirdPlaceMatch: { ...tournament.thirdPlaceMatch, homeScore: h, awayScore: a, played: true },
    });
    setEditingThirdPlace(false);
  };

  const handleClearThirdPlaceScore = () => {
    if (!tournament.thirdPlaceMatch) return;
    onChange({
      ...tournament,
      thirdPlaceMatch: { ...tournament.thirdPlaceMatch, homeScore: null, awayScore: null, played: false },
    });
  };

  // Additional playoff flow handlers
  const handleAddFlow = () => {
    if (!newFlowName.trim()) return;
    const matches: PlayoffMatch[] = newFlowTeams.map((pair, idx) => ({
      id: crypto.randomUUID(),
      round: 1,
      position: idx,
      homeTeamId: pair.home === '__none__' ? null : pair.home,
      awayTeamId: pair.away === '__none__' ? null : pair.away,
      homeScore: null,
      awayScore: null,
      played: false,
      date: null,
      time: null,
      venue: null,
    }));
    const flow: PlayoffFlow = {
      id: crypto.randomUUID(),
      name: newFlowName.trim(),
      matches,
      roundNames: {},
    };
    onChange({ ...tournament, additionalPlayoffs: [...(tournament.additionalPlayoffs || []), flow] });
    setShowAddFlowDialog(false);
    setNewFlowName('');
    setNewFlowTeams([{ home: '__none__', away: '__none__' }]);
  };

  const handleDeleteFlow = (flowId: string) => {
    onChange({ ...tournament, additionalPlayoffs: (tournament.additionalPlayoffs || []).filter(f => f.id !== flowId) });
  };

  const handleFlowSaveScore = (flowId: string, matchId: string) => {
    const h = parseInt(flowHomeScore, 10);
    const a = parseInt(flowAwayScore, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0 || h === a) return;
    const additionalPlayoffs = (tournament.additionalPlayoffs || []).map(flow =>
      flow.id === flowId ? {
        ...flow,
        matches: flow.matches.map(m => m.id === matchId ? { ...m, homeScore: h, awayScore: a, played: true } : m),
      } : flow
    );
    onChange({ ...tournament, additionalPlayoffs });
    setEditingFlowMatchId(null);
    setFlowHomeScore('');
    setFlowAwayScore('');
  };

  const handleFlowClearScore = (flowId: string, matchId: string) => {
    const additionalPlayoffs = (tournament.additionalPlayoffs || []).map(flow =>
      flow.id === flowId ? {
        ...flow,
        matches: flow.matches.map(m => m.id === matchId ? { ...m, homeScore: null, awayScore: null, played: false } : m),
      } : flow
    );
    onChange({ ...tournament, additionalPlayoffs });
  };

  const handleFlowDeleteMatch = (flowId: string, matchId: string) => {
    const additionalPlayoffs = (tournament.additionalPlayoffs || []).map(flow =>
      flow.id === flowId ? { ...flow, matches: flow.matches.filter(m => m.id !== matchId) } : flow
    );
    onChange({ ...tournament, additionalPlayoffs });
  };

  const handleFlowAddMatch = (flowId: string) => {
    const newMatch: PlayoffMatch = {
      id: crypto.randomUUID(),
      round: 1,
      position: 0,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      played: false,
      date: null,
      time: null,
      venue: null,
    };
    const additionalPlayoffs = (tournament.additionalPlayoffs || []).map(flow => {
      if (flow.id === flowId) {
        const maxPos = flow.matches.length > 0 ? Math.max(...flow.matches.map(m => m.position)) + 1 : 0;
        return { ...flow, matches: [...flow.matches, { ...newMatch, position: maxPos }] };
      }
      return flow;
    });
    onChange({ ...tournament, additionalPlayoffs });
  };

  const handleFlowEditTeams = (flowId: string, matchId: string) => {
    const additionalPlayoffs = (tournament.additionalPlayoffs || []).map(flow =>
      flow.id === flowId ? {
        ...flow,
        matches: flow.matches.map(m => m.id === matchId ? {
          ...m,
          homeTeamId: editFlowHome === '__none__' ? null : editFlowHome,
          awayTeamId: editFlowAway === '__none__' ? null : editFlowAway,
        } : m),
      } : flow
    );
    onChange({ ...tournament, additionalPlayoffs });
    setEditFlowTeamMatchId(null);
  };

  const handleAutoPopulate3rdPlace = () => {
    // Find semi-final losers from main bracket
    const semis = tournament.playoffs.filter(m => m.round === 2 && m.played);
    if (semis.length < 2) return;
    const losers = semis.map(m => (m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.awayTeamId : m.homeTeamId);
    const flow: PlayoffFlow = {
      id: crypto.randomUUID(),
      name: '3rd / 4th Place Playoff',
      matches: [{
        id: crypto.randomUUID(),
        round: 1,
        position: 0,
        homeTeamId: losers[0],
        awayTeamId: losers[1],
        homeScore: null,
        awayScore: null,
        played: false,
        date: null,
        time: null,
        venue: null,
      }],
      roundNames: {},
    };
    onChange({ ...tournament, additionalPlayoffs: [...(tournament.additionalPlayoffs || []), flow] });
  };

  const semisPlayed = tournament.playoffs.filter(m => m.round === 2 && m.played).length >= 2;
  const tpm = tournament.thirdPlaceMatch;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">Playoffs</h2>
      </div>

      {livePlayoffs.length === 0 ? (
        <div className="stat-card text-center space-y-6 py-8">
          <div className="space-y-2">
            <p className="text-muted-foreground font-medium">Auto-generate from pool standings</p>
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

          {!readOnly && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-muted-foreground font-medium">Or build a custom bracket</p>
              <Button variant="outline" size="sm" onClick={handleOpenCustomDialog}>
                <Settings2 className="h-4 w-4 mr-1" /> Custom Bracket
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onChange({ ...tournament, playoffs: tournament.playoffs.map(m => ({ ...m, isDeleted: true })), thirdPlaceMatch: null, additionalPlayoffs: [], playoffRoundNames: {} })}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset Bracket
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setShowAddDialog(true);
                const maxRound = rounds.length > 0 ? rounds[0] : 2;
                setAddRound(maxRound.toString());
                const existingInRound = tournament.playoffs.filter(m => m.round === maxRound);
                setAddPosition(existingInRound.length.toString());
              }}>
                <Plus className="h-3 w-3 mr-1" /> Add Match
              </Button>
              {semisPlayed && !tpm && (
                <Button variant="outline" size="sm" onClick={handleGenerateThirdPlace}>
                  <Medal className="h-3 w-3 mr-1" /> Add 3rd Place Match
                </Button>
              )}
              {semisPlayed && (
                <Button variant="outline" size="sm" onClick={handleAutoPopulate3rdPlace}>
                  <Medal className="h-3 w-3 mr-1" /> Add 3rd/4th Playoff
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowAddFlowDialog(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Playoff Flow
              </Button>
              <DeletedItemsBin tournament={tournament} onChange={onChange} scope={['playoffs']} />
            </div>
          )}

          <div className="flex gap-8 overflow-x-auto pb-4">
            {rounds.map((round) => (
              <div key={round} className="flex-shrink-0 space-y-3 min-w-[220px]">
                {/* Editable round name */}
                <div className="text-center">
                  {!readOnly && editingRoundName === round ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={roundNameInput}
                        onChange={e => setRoundNameInput(e.target.value)}
                        className="h-7 text-xs text-center"
                        placeholder={getRoundName(round)}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSaveRoundName(round)}
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveRoundName(round)}>
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <h3
                      className={`font-bold text-sm uppercase tracking-wide text-muted-foreground ${!readOnly ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
                      onClick={() => {
                        if (readOnly) return;
                        setEditingRoundName(round);
                        setRoundNameInput(tournament.playoffRoundNames?.[round] || '');
                      }}
                      title={!readOnly ? 'Click to rename' : undefined}
                    >
                      {getRoundName(round)}
                      {!readOnly && <Pencil className="h-2.5 w-2.5 inline ml-1 opacity-40" />}
                    </h3>
                  )}
                </div>

                <div className="space-y-4" style={{ paddingTop: `${(rounds[0] / round - 1) * 40}px` }}>
                  {livePlayoffs
                    .filter((m) => m.round === round)
                    .sort((a, b) => a.position - b.position)
                    .map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        tournament={tournament}
                        onChange={onChange}
                        readOnly={readOnly}
                        round={round}
                        topRound={rounds[0]}
                        allTeamIds={allTeamIds}
                        editingId={editingId}
                        setEditingId={setEditingId}
                        homeScore={homeScore}
                        setHomeScore={setHomeScore}
                        awayScore={awayScore}
                        setAwayScore={setAwayScore}
                        handleSaveScore={handleSaveScore}
                        handleClearScore={handleClearScore}
                        handleDeleteMatch={handleDeleteMatch}
                        editMatchId={editMatchId}
                        setEditMatchId={setEditMatchId}
                        editHome={editHome}
                        setEditHome={setEditHome}
                        editAway={editAway}
                        setEditAway={setEditAway}
                        schedulingId={schedulingId}
                        setSchedulingId={setSchedulingId}
                        schedDate={schedDate}
                        setSchedDate={setSchedDate}
                        schedTime={schedTime}
                        setSchedTime={setSchedTime}
                        schedVenue={schedVenue}
                        setSchedVenue={setSchedVenue}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* 3rd Place Match Section */}
          {tpm && (
            <div className="border-t pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold">3rd Place Playoff</h3>
                {!readOnly && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground ml-auto"
                    onClick={() => onChange({ ...tournament, thirdPlaceMatch: null })}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <div className={`rounded-lg border p-4 max-w-xs space-y-2 ${tpm.played ? 'bg-card border-amber-500/30' : 'bg-card'}`}>
                {editingThirdPlace ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{getTeamName(tournament, tpm.homeTeamId)}</span>
                      <Input type="number" min="0" value={thirdHomeScore} onChange={e => setThirdHomeScore(e.target.value)} className="w-14 h-7 text-center text-sm" autoFocus />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{getTeamName(tournament, tpm.awayTeamId)}</span>
                      <Input type="number" min="0" value={thirdAwayScore} onChange={e => setThirdAwayScore(e.target.value)} className="w-14 h-7 text-center text-sm" onKeyDown={e => e.key === 'Enter' && handleSaveThirdPlaceScore()} />
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" onClick={handleSaveThirdPlaceScore}>
                      <Check className="h-3 w-3 mr-1" /> Save (no draws)
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      className="w-full text-left space-y-1"
                      onClick={() => {
                        if (readOnly || !tpm.homeTeamId || !tpm.awayTeamId) return;
                        setEditingThirdPlace(true);
                        setThirdHomeScore(tpm.homeScore?.toString() || '');
                        setThirdAwayScore(tpm.awayScore?.toString() || '');
                      }}
                      disabled={readOnly || !tpm.homeTeamId || !tpm.awayTeamId}
                    >
                      <div className={`flex justify-between text-sm ${tpm.played && (tpm.homeScore ?? 0) > (tpm.awayScore ?? 0) ? 'font-bold' : ''}`}>
                        <span className="truncate">{getTeamName(tournament, tpm.homeTeamId)}</span>
                        {tpm.played && <span className="font-mono">{tpm.homeScore}</span>}
                      </div>
                      <div className={`flex justify-between text-sm ${tpm.played && (tpm.awayScore ?? 0) > (tpm.homeScore ?? 0) ? 'font-bold' : ''}`}>
                        <span className="truncate">{getTeamName(tournament, tpm.awayTeamId)}</span>
                        {tpm.played && <span className="font-mono">{tpm.awayScore}</span>}
                      </div>
                    </button>
                    {!readOnly && tpm.played && (
                      <Button variant="ghost" size="sm" className="absolute -top-1 -right-1 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={handleClearThirdPlaceScore} title="Clear score">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    {tpm.played && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <Trophy className="h-3 w-3" />
                        <span className="font-medium">3rd Place: {getTeamName(tournament, (tpm.homeScore ?? 0) > (tpm.awayScore ?? 0) ? tpm.homeTeamId : tpm.awayTeamId)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Additional Playoff Flows */}
          {((tournament.additionalPlayoffs || []).length > 0 || !readOnly) && (
            <div className="space-y-4">
              {(tournament.additionalPlayoffs || []).map(flow => (
                <div key={flow.id} className="border-t pt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-accent" />
                    <h3 className="text-lg font-bold">{flow.name}</h3>
                    {!readOnly && (
                      <div className="ml-auto flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleFlowAddMatch(flow.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Match
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleDeleteFlow(flow.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove Flow
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {flow.matches.map(match => (
                      <div key={match.id} className={`rounded-lg border p-3 space-y-2 ${match.played ? 'bg-card border-accent/30' : 'bg-card'}`}>
                        {editingFlowMatchId === match.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs flex-1 truncate">{getTeamName(tournament, match.homeTeamId)}</span>
                              <Input type="number" min="0" value={flowHomeScore} onChange={e => setFlowHomeScore(e.target.value)} className="w-14 h-7 text-center text-sm" autoFocus />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs flex-1 truncate">{getTeamName(tournament, match.awayTeamId)}</span>
                              <Input type="number" min="0" value={flowAwayScore} onChange={e => setFlowAwayScore(e.target.value)} className="w-14 h-7 text-center text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleFlowSaveScore(flow.id, match.id)} />
                            </div>
                            <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleFlowSaveScore(flow.id, match.id)}>
                              <Check className="h-3 w-3 mr-1" /> Save (no draws)
                            </Button>
                          </div>
                        ) : editFlowTeamMatchId === match.id ? (
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground">Home Team</label>
                            <Select value={editFlowHome} onValueChange={setEditFlowHome}>
                              <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Select team" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— TBD —</SelectItem>
                                {allTeamIds.map(tid => <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <label className="text-[10px] text-muted-foreground">Away Team</label>
                            <Select value={editFlowAway} onValueChange={setEditFlowAway}>
                              <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Select team" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— TBD —</SelectItem>
                                {allTeamIds.map(tid => <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Button size="sm" className="flex-1 h-6 text-xs" onClick={() => handleFlowEditTeams(flow.id, match.id)}>
                                <Check className="h-2.5 w-2.5 mr-1" /> Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setEditFlowTeamMatchId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              className="w-full text-left space-y-1"
                              onClick={() => {
                                if (readOnly || !match.homeTeamId || !match.awayTeamId) return;
                                setEditingFlowMatchId(match.id);
                                setFlowHomeScore(match.homeScore?.toString() || '');
                                setFlowAwayScore(match.awayScore?.toString() || '');
                              }}
                              disabled={readOnly || !match.homeTeamId || !match.awayTeamId}
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
                            {!readOnly && (
                              <div className="absolute -top-1 -right-1 flex gap-0.5">
                                {match.played && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleFlowClearScore(flow.id, match.id)} title="Clear score">
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleFlowDeleteMatch(flow.id, match.id)} title="Delete match">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {!readOnly && !match.played && (
                              <Button variant="ghost" size="sm" className="w-full h-5 text-[10px] text-muted-foreground hover:text-foreground mt-1"
                                onClick={() => { setEditFlowTeamMatchId(match.id); setEditFlowHome(match.homeTeamId || '__none__'); setEditFlowAway(match.awayTeamId || '__none__'); }}>
                                <Pencil className="h-2.5 w-2.5 mr-1" /> Edit Teams
                              </Button>
                            )}
                            {match.played && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                                <Trophy className="h-3 w-3" />
                                <span className="font-medium">Winner: {getTeamName(tournament, (match.homeScore ?? 0) > (match.awayScore ?? 0) ? match.homeTeamId : match.awayTeamId)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Playoff Flow Dialog */}
      <Dialog open={showAddFlowDialog} onOpenChange={setShowAddFlowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Playoff Flow</DialogTitle>
            <DialogDescription>Create a new playoff flow (e.g. 3rd/4th Place, 5th-8th Place)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Flow Name</Label>
              <Input value={newFlowName} onChange={e => setNewFlowName(e.target.value)} placeholder="e.g. 3rd / 4th Place Playoff" className="mt-1" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Matches</Label>
              {newFlowTeams.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">M{idx + 1}</span>
                  <Select value={pair.home} onValueChange={v => {
                    const updated = [...newFlowTeams];
                    updated[idx] = { ...updated[idx], home: v };
                    setNewFlowTeams(updated);
                  }}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Home" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— TBD —</SelectItem>
                      {allTeamIds.map(tid => <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <Select value={pair.away} onValueChange={v => {
                    const updated = [...newFlowTeams];
                    updated[idx] = { ...updated[idx], away: v };
                    setNewFlowTeams(updated);
                  }}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Away" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— TBD —</SelectItem>
                      {allTeamIds.map(tid => <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {newFlowTeams.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setNewFlowTeams(newFlowTeams.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setNewFlowTeams([...newFlowTeams, { home: '__none__', away: '__none__' }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Match
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFlowDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFlow} disabled={!newFlowName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Create Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Playoff Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Round</label>
                <Select value={addRound} onValueChange={setAddRound}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select round" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...rounds, 1, 2, 4, 8, 16])].sort((a, b) => b - a).map(r => (
                      <SelectItem key={r} value={r.toString()}>{getRoundName(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Position</label>
                <Input type="number" min={0} value={addPosition} onChange={(e) => setAddPosition(e.target.value)} className="mt-1" placeholder="Match position" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Home Team</label>
              <Select value={addHome} onValueChange={setAddHome}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— TBD —</SelectItem>
                  {allTeamIds.map(tid => (
                    <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Away Team</label>
              <Select value={addAway} onValueChange={setAddAway}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— TBD —</SelectItem>
                  {allTeamIds.map(tid => (
                    <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddMatch} disabled={!addRound || addPosition === ''}>
              <Plus className="h-4 w-4 mr-1" /> Add Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Bracket Builder Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Build Custom Playoff Bracket</DialogTitle>
            <DialogDescription>Define your bracket structure and optionally assign teams to each match.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Template selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bracket Template</Label>
              <div className="flex flex-wrap gap-2">
                {['2', '4', '8', '16'].map(size => (
                  <Button
                    key={size}
                    variant={customTemplate === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCustomTemplate(size);
                      initCustomRounds(parseInt(size));
                    }}
                  >
                    {size}-Team
                  </Button>
                ))}
              </div>
            </div>

            {/* Rounds editor */}
            {customRounds.map((round, roundIdx) => (
              <div key={roundIdx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={round.name}
                    onChange={e => {
                      const updated = [...customRounds];
                      updated[roundIdx] = { ...updated[roundIdx], name: e.target.value };
                      setCustomRounds(updated);
                    }}
                    className="h-8 text-sm font-semibold flex-1"
                    placeholder="Round name"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {round.matchCount} match{round.matchCount > 1 ? 'es' : ''}
                  </span>
                  {/* Allow adding/removing matches in this round */}
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => {
                      const updated = [...customRounds];
                      updated[roundIdx] = {
                        ...updated[roundIdx],
                        matchCount: updated[roundIdx].matchCount + 1,
                        teams: [...updated[roundIdx].teams, { home: '__none__', away: '__none__' }],
                      };
                      setCustomRounds(updated);
                    }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    {round.matchCount > 1 && (
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => {
                        const updated = [...customRounds];
                        updated[roundIdx] = {
                          ...updated[roundIdx],
                          matchCount: updated[roundIdx].matchCount - 1,
                          teams: updated[roundIdx].teams.slice(0, -1),
                        };
                        setCustomRounds(updated);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Matches in this round */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {round.teams.map((teamPair, matchIdx) => (
                    <div key={matchIdx} className="flex items-center gap-1 border rounded p-2 bg-muted/30">
                      <span className="text-xs text-muted-foreground w-5">M{matchIdx + 1}</span>
                      <Select value={teamPair.home} onValueChange={v => {
                        const updated = [...customRounds];
                        const teams = [...updated[roundIdx].teams];
                        teams[matchIdx] = { ...teams[matchIdx], home: v };
                        updated[roundIdx] = { ...updated[roundIdx], teams };
                        setCustomRounds(updated);
                      }}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Home" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">TBD</SelectItem>
                          {allTeamIds.map(tid => (
                            <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <Select value={teamPair.away} onValueChange={v => {
                        const updated = [...customRounds];
                        const teams = [...updated[roundIdx].teams];
                        teams[matchIdx] = { ...teams[matchIdx], away: v };
                        updated[roundIdx] = { ...updated[roundIdx], teams };
                        setCustomRounds(updated);
                      }}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Away" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">TBD</SelectItem>
                          {allTeamIds.map(tid => (
                            <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add/remove round */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const lastRound = customRounds[customRounds.length - 1];
                const newMatchCount = lastRound ? Math.max(1, Math.floor(lastRound.matchCount / 2)) : 1;
                setCustomRounds([...customRounds, {
                  name: `Round ${customRounds.length + 1}`,
                  matchCount: newMatchCount,
                  teams: Array.from({ length: newMatchCount }, () => ({ home: '__none__', away: '__none__' })),
                }]);
              }}>
                <Plus className="h-3 w-3 mr-1" /> Add Round
              </Button>
              {customRounds.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => setCustomRounds(customRounds.slice(0, -1))}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove Last Round
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Cancel</Button>
            <Button onClick={handleApplyCustomBracket} disabled={customRounds.length === 0}>
              <Settings2 className="h-4 w-4 mr-1" /> Create Bracket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Extracted MatchCard sub-component ── */
interface MatchCardProps {
  match: PlayoffMatch;
  tournament: Tournament;
  onChange: (t: Tournament) => void;
  readOnly: boolean;
  round: number;
  topRound: number;
  allTeamIds: string[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  homeScore: string;
  setHomeScore: (v: string) => void;
  awayScore: string;
  setAwayScore: (v: string) => void;
  handleSaveScore: (id: string) => void;
  handleClearScore: (id: string) => void;
  handleDeleteMatch: (id: string) => void;
  editMatchId: string | null;
  setEditMatchId: (id: string | null) => void;
  editHome: string;
  setEditHome: (v: string) => void;
  editAway: string;
  setEditAway: (v: string) => void;
  schedulingId: string | null;
  setSchedulingId: (id: string | null) => void;
  schedDate: string;
  setSchedDate: (v: string) => void;
  schedTime: string;
  setSchedTime: (v: string) => void;
  schedVenue: string;
  setSchedVenue: (v: string) => void;
}

function MatchCard({
  match, tournament, onChange, readOnly, round, topRound, allTeamIds,
  editingId, setEditingId, homeScore, setHomeScore, awayScore, setAwayScore,
  handleSaveScore, handleClearScore, handleDeleteMatch,
  editMatchId, setEditMatchId, editHome, setEditHome, editAway, setEditAway,
  schedulingId, setSchedulingId, schedDate, setSchedDate, schedTime, setSchedTime, schedVenue, setSchedVenue,
}: MatchCardProps) {
  const isEditing = editingId === match.id;
  const canEdit = Boolean(match.homeTeamId && match.awayTeamId);

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 animate-slide-in ${
        match.played ? 'bg-card border-secondary/30' : 'bg-card'
      } ${round === 1 ? 'ring-2 ring-accent/30' : ''}`}
      style={{ marginBottom: `${(topRound / round - 1) * 40}px` }}
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
          {!readOnly && (
            <div className="absolute -top-1 -right-1 flex gap-0.5">
              {match.played && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleClearScore(match.id)} title="Clear score & reset">
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteMatch(match.id)} title="Delete match">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Schedule info */}
      {(match.date || match.time || match.venue) && schedulingId !== match.id && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground border-t pt-1">
          {match.date && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{match.date}</span>}
          {match.time && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{match.time}</span>}
          {match.venue && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{match.venue}</span>}
        </div>
      )}

      {/* Edit teams button */}
      {!readOnly && !isEditing && editMatchId !== match.id && schedulingId !== match.id && !match.played && (
        <Button variant="ghost" size="sm" className="w-full h-5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => { setEditMatchId(match.id); setEditHome(match.homeTeamId || ''); setEditAway(match.awayTeamId || ''); }}>
          <Pencil className="h-2.5 w-2.5 mr-1" /> Edit Teams
        </Button>
      )}

      {/* Edit teams form */}
      {!readOnly && editMatchId === match.id && (
        <div className="space-y-1 border-t pt-2">
          <label className="text-[10px] text-muted-foreground">Home Team</label>
          <Select value={editHome} onValueChange={setEditHome}>
            <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Select team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {allTeamIds.map(tid => <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="text-[10px] text-muted-foreground">Away Team</label>
          <Select value={editAway} onValueChange={setEditAway}>
            <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="Select team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {allTeamIds.map(tid => <SelectItem key={tid} value={tid}>{getTeamName(tournament, tid)}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button size="sm" className="flex-1 h-6 text-xs" onClick={() => {
              const playoffs = tournament.playoffs.map(m =>
                m.id === match.id ? { ...m, homeTeamId: editHome === '__none__' ? null : editHome, awayTeamId: editAway === '__none__' ? null : editAway } : m
              );
              onChange({ ...tournament, playoffs });
              setEditMatchId(null);
            }}>
              <Check className="h-2.5 w-2.5 mr-1" /> Save
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setEditMatchId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Schedule button */}
      {!readOnly && !isEditing && editMatchId !== match.id && schedulingId !== match.id && (
        <Button variant="ghost" size="sm" className="w-full h-5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => { setSchedulingId(match.id); setSchedDate(match.date || ''); setSchedTime(match.time || ''); setSchedVenue(match.venue || ''); }}>
          <Calendar className="h-2.5 w-2.5 mr-1" /> Schedule
        </Button>
      )}

      {/* Schedule form */}
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
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setSchedulingId(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
