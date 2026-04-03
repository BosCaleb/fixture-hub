import * as pdfjsLib from 'pdfjs-dist';
import { Tournament, Fixture } from './types';


// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface ParsedFixture {
  poolName: string;
  round: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

/**
 * Extract text items from a PDF file and parse fixture rows.
 * Supports the format exported by exportFixturesPDF:
 *   Pool header row, then table rows: Round | Home | Score | Away | Status
 * Also supports variations seen in real PDFs where tables may lose headers
 * across pages but maintain the same column structure.
 */
export async function importFixturesFromPDF(
  tournament: Tournament,
  file: File,
): Promise<Tournament> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allText: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Group text items by Y position to reconstruct rows
    const rows = groupTextIntoRows(content.items as TextItem[]);
    allText.push(...rows);
  }

  const parsed = parseFixtureLines(allText);
  return applyParsedFixtures(tournament, parsed);
}

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Group PDF text items by their Y coordinate into logical rows,
 * then join each row's items left-to-right separated by |.
 */
function groupTextIntoRows(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  // Group by Y position (rounded to handle slight variations)
  const rowMap = new Map<number, { x: number; text: string }[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    if (!rowMap.has(y)) rowMap.set(y, []);
    rowMap.get(y)!.push({ x, text: item.str.trim() });
  }

  // Sort rows top-to-bottom (highest Y first in PDF coords)
  const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);

  return sortedYs.map((y) => {
    const cells = rowMap.get(y)!.sort((a, b) => a.x - b.x);
    return cells.map((c) => c.text).join(' | ');
  });
}

/**
 * Parse reconstructed text rows into fixture data.
 * Looks for pool headers (e.g. "Pool A", "Pool B") and
 * fixture rows matching the pattern: Round N | Team | Score | Team | Status
 */
function parseFixtureLines(lines: string[]): ParsedFixture[] {
  const fixtures: ParsedFixture[] = [];
  let currentPool = '';
  let currentRoundFallback = 0;

  for (const line of lines) {
    // Detect pool header
    const poolMatch = line.match(/Pool\s+([A-Za-z0-9]+)/i);
    if (poolMatch && !line.includes(' - ') && !line.toLowerCase().includes('vs')) {
      currentPool = `Pool ${poolMatch[1].toUpperCase()}`;
      continue;
    }

    // Detect standalone round header like "Round 20"
    const roundHeaderMatch = line.match(/^Round\s+(\d+)$/i);
    if (roundHeaderMatch) {
      currentRoundFallback = parseInt(roundHeaderMatch[1], 10);
      continue;
    }

    // Skip non-fixture lines
    if (!currentPool) continue;
    if (line.toLowerCase().includes('fixture sheet')) continue;
    if (line.toLowerCase().includes('managed by')) continue;
    if (line.toLowerCase().includes('round results')) continue;
    if (line.toLowerCase().includes('match results')) continue;

    // Try to parse fixture row
    const fixture = parseFixtureRow(line, currentPool, currentRoundFallback);
    if (fixture) {
      fixtures.push(fixture);
    }
  }

  return fixtures;
}

/**
 * Parse a single row that may look like:
 * "Round 2 | Tygerberg High | 30 - 34 | Waterkloof High 1 | Played"
 * or without the Round prefix in headerless tables:
 * "Tygerberg High | 30 - 34 | Waterkloof High 1 | Played"
 */
function parseFixtureRow(line: string, poolName: string, fallbackRound: number): ParsedFixture | null {
  const parts = line.split('|').map((s) => s.trim()).filter(Boolean);

  // Skip header rows
  if (parts.some((p) => p.toLowerCase() === 'home' || p.toLowerCase() === 'round' || p.toLowerCase() === '#')) {
    return null;
  }
  // Skip separator rows (e.g. "---")
  if (parts.some((p) => /^-+$/.test(p))) {
    return null;
  }

  let round = fallbackRound;
  let homeTeam = '';
  let awayTeam = '';
  let scoreStr = '';
  let statusStr = '';

  if (parts.length >= 5) {
    // Format: Round | Home | Score | Away | Status
    const roundMatch = parts[0].match(/(\d+)/);
    if (roundMatch) round = parseInt(roundMatch[1], 10);
    homeTeam = parts[1];
    scoreStr = parts[2];
    awayTeam = parts[3];
    statusStr = parts[4];
  } else if (parts.length === 4) {
    // Format without explicit status or without round prefix:
    // Home | Score | Away | Status  (using fallbackRound)
    homeTeam = parts[0];
    scoreStr = parts[1];
    awayTeam = parts[2];
    statusStr = parts[3];
  } else {
    return null;
  }

  if (!homeTeam || !awayTeam) return null;

  // Parse score
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let played = false;

  const scoreMatch = scoreStr.match(/(\d+)\s*-\s*(\d+)/);
  if (scoreMatch) {
    homeScore = parseInt(scoreMatch[1], 10);
    awayScore = parseInt(scoreMatch[2], 10);
    played = true;
  } else if (statusStr.toLowerCase() === 'played' && scoreStr !== 'vs') {
    played = true;
  }

  return {
    poolName,
    round: round || 1,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    played,
  };
}

/**
 * Apply parsed fixtures to the tournament, matching teams and pools by name.
 * Creates new fixtures (skips duplicates based on pool+home+away+round).
 */
function applyParsedFixtures(tournament: Tournament, parsed: ParsedFixture[]): Tournament {
  const updated = { ...tournament, fixtures: [...tournament.fixtures] };
  let added = 0;
  let skipped = 0;

  for (const pf of parsed) {
    const pool = updated.pools.find(
      (p) => p.name.toLowerCase() === pf.poolName.toLowerCase(),
    );
    if (!pool) {
      skipped++;
      continue;
    }

    const home = updated.teams.find(
      (t) => t.name.toLowerCase() === pf.homeTeam.toLowerCase(),
    );
    const away = updated.teams.find(
      (t) => t.name.toLowerCase() === pf.awayTeam.toLowerCase(),
    );
    if (!home || !away || home.id === away.id) {
      skipped++;
      continue;
    }

    // Check for duplicate
    const exists = updated.fixtures.some(
      (f) =>
        f.poolId === pool.id &&
        f.homeTeamId === home.id &&
        f.awayTeamId === away.id &&
        f.round === pf.round,
    );
    if (exists) {
      // Update score if the existing fixture has no score but the PDF does
      if (pf.played) {
        updated.fixtures = updated.fixtures.map((f) => {
          if (
            f.poolId === pool.id &&
            f.homeTeamId === home.id &&
            f.awayTeamId === away.id &&
            f.round === pf.round &&
            !f.played
          ) {
            return { ...f, homeScore: pf.homeScore, awayScore: pf.awayScore, played: true };
          }
          return f;
        });
      }
      continue;
    }

    const fixture: Fixture = {
      id: crypto.randomUUID(),
      poolId: pool.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: pf.homeScore,
      awayScore: pf.awayScore,
      played: pf.played,
      round: pf.round,
      date: null,
      time: null,
      venue: null,
    };

    updated.fixtures.push(fixture);
    added++;
  }

  return updated;
}
