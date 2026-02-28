import { Tournament } from '@/lib/types';
import { calculateStandings, exportToCSV } from '@/lib/tournament-store';
import { Button } from '@/components/ui/button';
import { Trophy, Download } from 'lucide-react';

interface Props {
  tournament: Tournament;
}

export function StandingsView({ tournament }: Props) {
  const handleExport = (poolId: string, poolName: string) => {
    const standings = calculateStandings(tournament, poolId);
    const csv = exportToCSV(standings, poolName);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${poolName}-standings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">Standings</h2>
      </div>

      {tournament.pools.map(pool => {
        const standings = calculateStandings(tournament, pool.id);
        if (standings.length === 0) return null;

        return (
          <div key={pool.id} className="space-y-2 animate-slide-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{pool.name}</h3>
              <Button variant="outline" size="sm" onClick={() => handleExport(pool.id, pool.name)}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="tournament-gradient text-primary-foreground">
                    <th className="text-left py-2 px-3 font-semibold">#</th>
                    <th className="text-left py-2 px-3 font-semibold">Team</th>
                    <th className="text-center py-2 px-3 font-semibold">P</th>
                    <th className="text-center py-2 px-3 font-semibold">W</th>
                    <th className="text-center py-2 px-3 font-semibold">D</th>
                    <th className="text-center py-2 px-3 font-semibold">L</th>
                    <th className="text-center py-2 px-3 font-semibold">GF</th>
                    <th className="text-center py-2 px-3 font-semibold">GA</th>
                    <th className="text-center py-2 px-3 font-semibold">GD</th>
                    <th className="text-center py-2 px-3 font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr
                      key={s.teamId}
                      className={`border-t transition-colors ${
                        i === 0 ? 'bg-accent/10 font-semibold' : 'hover:bg-muted/50'
                      }`}
                    >
                      <td className="py-2 px-3">
                        {i === 0 && <span className="text-accent">●</span>} {i + 1}
                      </td>
                      <td className="py-2 px-3 font-medium">{s.teamName}</td>
                      <td className="text-center py-2 px-3">{s.played}</td>
                      <td className="text-center py-2 px-3">{s.won}</td>
                      <td className="text-center py-2 px-3">{s.drawn}</td>
                      <td className="text-center py-2 px-3">{s.lost}</td>
                      <td className="text-center py-2 px-3">{s.goalsFor}</td>
                      <td className="text-center py-2 px-3">{s.goalsAgainst}</td>
                      <td className="text-center py-2 px-3 font-mono">
                        {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                      </td>
                      <td className="text-center py-2 px-3 font-bold text-secondary">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Tie-break: Points → Goal Difference → Goals For → Alphabetical
            </p>
          </div>
        );
      })}

      {tournament.pools.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Create pools and play matches to see standings
        </p>
      )}
    </div>
  );
}
