/**
 * Hook that fetches analytics standings with automatic fallback
 * to the existing client-side calculateStandings when analytics is unavailable.
 */
import { useEffect, useState, useCallback } from 'react';
import { Tournament, Standing } from '@/lib/types';
import { calculateStandings } from '@/lib/tournament-store';
import { fetchAnalyticsStandings } from '@/lib/supabase/queries/analytics';
import type { AnalyticsPoolStanding } from '@/lib/types/analytics';

export type StandingsSource = 'analytics' | 'local';

interface PoolStandings {
  poolId: string;
  poolName: string;
  standings: Standing[];
}

interface UseAnalyticsStandingsResult {
  poolStandings: PoolStandings[];
  source: StandingsSource;
  loading: boolean;
  refresh: () => void;
}

/** Convert analytics rows into the existing Standing shape grouped by pool */
function mapAnalyticsToPoolStandings(rows: AnalyticsPoolStanding[]): PoolStandings[] {
  const grouped = new Map<string, { poolName: string; standings: Standing[] }>();
  for (const r of rows) {
    if (!grouped.has(r.pool_id)) {
      grouped.set(r.pool_id, { poolName: r.pool_name, standings: [] });
    }
    grouped.get(r.pool_id)!.standings.push({
      teamId: r.team_id,
      teamName: r.team_name,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goals_for,
      goalsAgainst: r.goals_against,
      goalDifference: r.goal_difference,
      points: r.points,
    });
  }
  return Array.from(grouped.entries()).map(([poolId, v]) => ({
    poolId,
    poolName: v.poolName,
    standings: v.standings,
  }));
}

/** Build standings from the local Tournament object (existing logic) */
function buildLocalStandings(tournament: Tournament): PoolStandings[] {
  return tournament.pools
    .map((pool) => ({
      poolId: pool.id,
      poolName: pool.name,
      standings: calculateStandings(tournament, pool.id),
    }))
    .filter((ps) => ps.standings.length > 0);
}

export function useAnalyticsStandings(tournament: Tournament): UseAnalyticsStandingsResult {
  const [poolStandings, setPoolStandings] = useState<PoolStandings[]>([]);
  const [source, setSource] = useState<StandingsSource>('local');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Try analytics first
      const analyticsData = await fetchAnalyticsStandings(tournament.id);
      if (cancelled) return;

      if (analyticsData && analyticsData.length > 0) {
        setPoolStandings(mapAnalyticsToPoolStandings(analyticsData));
        setSource('analytics');
      } else {
        // Fallback to local calculation
        setPoolStandings(buildLocalStandings(tournament));
        setSource('local');
      }
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [tournament, tick]);

  return { poolStandings, source, loading, refresh };
}
