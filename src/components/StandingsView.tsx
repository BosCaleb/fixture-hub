import { Tournament } from '@/lib/types';
import { exportToCSV } from '@/lib/tournament-store';
import { exportStandingsPDF } from '@/lib/pdf-export';
import { useAnalyticsStandings } from '@/hooks/use-analytics-standings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Download, FileText, Database, Cpu } from 'lucide-react';

interface Props {
  tournament: Tournament;
}

export function StandingsView({ tournament }: Props) {
  const { poolStandings, source, loading } = useAnalyticsStandings(tournament);

  const handleExport = (poolId: string, poolName: string) => {
    const ps = poolStandings.find((p) => p.poolId === poolId);
    if (!ps) return;
    const csv = exportToCSV(ps.standings, poolName);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${poolName}-standings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent animate-pulse" />
          <h2 className="text-xl">Loading standings…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="text-xl">Standings</h2>
          <Badge variant="outline" className="text-[10px] gap-1">
            {source === 'analytics' ? <Database className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
            {source === 'analytics' ? 'Analytics' : 'Live'}
          </Badge>
        </div>
        {poolStandings.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportStandingsPDF(tournament)} className="uppercase tracking-wide text-xs font-bold">
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        )}
      </div>

      {poolStandings.map(({ poolId, poolName, standings }) => (
        <div key={poolId} className="space-y-2 animate-slide-in">
          <div className="flex items-center justify-between">
            <div className="espn-section-header flex-1 text-white">{poolName}</div>
            <Button variant="outline" size="sm" onClick={() => handleExport(poolId, poolName)} className="ml-2 uppercase tracking-wide text-xs font-bold">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>

          <div className="rounded border overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[480px]">
              <thead>
                <tr className="tournament-gradient text-white">
                  <th className="text-left py-2 px-2 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">#</th>
                  <th className="text-left py-2 px-2 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">Team</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">P</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">W</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">D</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">L</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">GF</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">GA</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">GD</th>
                  <th className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-[10px] sm:text-xs uppercase tracking-wider">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr
                    key={s.teamId}
                    className={`border-t transition-colors ${
                      i === 0 ? 'bg-accent/10 font-semibold border-l-4 border-l-accent' : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className="py-2 px-2 sm:py-2.5 sm:px-3 font-bold">{i + 1}</td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-3 font-medium truncate max-w-[120px]">{s.teamName}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3">{s.played}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-success">{s.won}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3">{s.drawn}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 text-destructive">{s.lost}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3">{s.goalsFor}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3">{s.goalsAgainst}</td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 score-badge">
                      {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                    </td>
                    <td className="text-center py-2 px-1.5 sm:py-2.5 sm:px-3 font-bold text-accent score-badge text-sm sm:text-base">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Tie-break: Points → Goal Difference → Goals For → Alphabetical
          </p>
        </div>
      ))}

      {poolStandings.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Create pools and play matches to see standings
        </p>
      )}
    </div>
  );
}
