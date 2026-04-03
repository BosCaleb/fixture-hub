import { useState, useRef } from 'react';
import { Tournament, RankingList } from '@/lib/types';
import { activeTeams } from '@/lib/tournament-store';
import { exportRankingsPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, Trophy, Medal, Award, Edit2 } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onChange: (t: Tournament) => void;
  readOnly?: boolean;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return null;
}

export function RankingsManager({ tournament, onChange, readOnly }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [addTeamListId, setAddTeamListId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const dragItem = useRef<{ listId: string; index: number } | null>(null);
  const dragOverItem = useRef<{ listId: string; index: number } | null>(null);

  const teams = activeTeams(tournament);
  const rankings = tournament.rankings ?? [];

  function createList() {
    if (!newName.trim()) return;
    const list: RankingList = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      teamIds: [],
    };
    onChange({ ...tournament, rankings: [...rankings, list] });
    setNewName('');
    setShowCreate(false);
  }

  function deleteList(id: string) {
    onChange({ ...tournament, rankings: rankings.filter(r => r.id !== id) });
  }

  function renameList(id: string) {
    if (!editNameValue.trim()) return;
    onChange({
      ...tournament,
      rankings: rankings.map(r => r.id === id ? { ...r, name: editNameValue.trim() } : r),
    });
    setEditingNameId(null);
  }

  function addTeam(listId: string) {
    if (!selectedTeamId) return;
    onChange({
      ...tournament,
      rankings: rankings.map(r =>
        r.id === listId && !r.teamIds.includes(selectedTeamId)
          ? { ...r, teamIds: [...r.teamIds, selectedTeamId] }
          : r
      ),
    });
    setSelectedTeamId('');
    setAddTeamListId(null);
  }

  function removeTeam(listId: string, teamId: string) {
    onChange({
      ...tournament,
      rankings: rankings.map(r =>
        r.id === listId ? { ...r, teamIds: r.teamIds.filter(t => t !== teamId) } : r
      ),
    });
  }

  function handleDragStart(listId: string, index: number) {
    dragItem.current = { listId, index };
  }

  function handleDragEnter(listId: string, index: number) {
    dragOverItem.current = { listId, index };
  }

  function handleDragEnd() {
    if (!dragItem.current || !dragOverItem.current) return;
    if (dragItem.current.listId !== dragOverItem.current.listId) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const listId = dragItem.current.listId;
    const list = rankings.find(r => r.id === listId);
    if (!list) return;

    const newTeamIds = [...list.teamIds];
    const draggedItem = newTeamIds.splice(dragItem.current.index, 1)[0];
    newTeamIds.splice(dragOverItem.current.index, 0, draggedItem);

    onChange({
      ...tournament,
      rankings: rankings.map(r => r.id === listId ? { ...r, teamIds: newTeamIds } : r),
    });

    dragItem.current = null;
    dragOverItem.current = null;
  }

  function getTeamName(teamId: string): string {
    return teams.find(t => t.id === teamId)?.name ?? 'Unknown Team';
  }

  if (rankings.length === 0 && readOnly) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No rankings published yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="flex justify-end">
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 uppercase tracking-wide text-xs font-bold">
                <Plus className="h-4 w-4" /> New Ranking
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Ranking List</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="e.g. Overall Power Rankings"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createList()}
              />
              <DialogFooter>
                <Button onClick={createList} disabled={!newName.trim()}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {rankings.map(list => {
        const availableTeams = teams.filter(t => !list.teamIds.includes(t.id));
        return (
          <Card key={list.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              {editingNameId === list.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && renameList(list.id)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" variant="outline" onClick={() => renameList(list.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNameId(null)}>Cancel</Button>
                </div>
              ) : (
                <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  {list.name}
                  {!readOnly && (
                    <button onClick={() => { setEditingNameId(list.id); setEditNameValue(list.name); }}>
                      <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </h3>
              )}
              {!readOnly && (
                <div className="flex items-center gap-1">
                  {addTeamListId === list.id ? (
                    <div className="flex items-center gap-1">
                      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                        <SelectTrigger className="h-8 w-[180px] text-xs">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => addTeam(list.id)} disabled={!selectedTeamId}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddTeamListId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddTeamListId(list.id)}>
                      <Plus className="h-3 w-3" /> Add Team
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteList(list.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {list.teamIds.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {readOnly ? 'No teams ranked yet.' : 'Add teams and drag to reorder.'}
              </p>
            ) : (
              <div className="space-y-1">
                {list.teamIds.map((teamId, index) => (
                  <div
                    key={teamId}
                    draggable={!readOnly}
                    onDragStart={() => handleDragStart(list.id, index)}
                    onDragEnter={() => handleDragEnter(list.id, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-muted/50 border border-border/50 hover:border-border transition-colors group"
                  >
                    {!readOnly && (
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                    )}
                    <span className="w-7 text-center text-xs font-bold text-muted-foreground flex items-center justify-center">
                      {getRankIcon(index + 1) ?? `#${index + 1}`}
                    </span>
                    <span className="text-sm font-medium flex-1">{getTeamName(teamId)}</span>
                    {!readOnly && (
                      <button
                        onClick={() => removeTeam(list.id, teamId)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
