import { Tournament, Fixture } from './types';

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
 * Dynamically load pdf.js from CDN (no npm dependency needed).
 * Returns the pdfjsLib global.
 */
async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) { reject(new Error('pdf.js failed to load')); return; }
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Import fixtures from a PDF file exported by our exportFixturesPDF function.
 * Uses dynamically loaded pdf.js from CDN - no npm package needed.
 */
export async function importFixturesFromPDF(
  tournament: Tournament,
  file: File,
): Promise<Tournament> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allRows: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rows = groupTextIntoRows(content.items);
    allRows.push(...rows);
  }

  const parsed = parseFixtureLines(allRows);
  return applyParsedFixtures(tournament, parsed);
}

interface TextItem {
  str: string;
  transform: number[];
}

function groupTextIntoRows(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  const rowMap = new Map<number, { x: number; text: string }[]>();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    if (!rowMap.has(y)) rowMap.set(y, []);
    rowMap.get(y)!.push({ x, text: item.str.trim() });
  }

  const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);

  return sortedYs.map((y) => {
    const cells = rowMap.get(y)!.sort((a, b) => a.x - b.x);
    return cells.map((c) => c.text).join(' | ');
  });
}

function parseFixtureLines(lines: string[]): ParsedFixture[] {
  const fixtures: ParsedFixture[] = [];
  let currentPool = '';
  let currentRoundFallback = 0;

  for (const line of lines) {
    const poolMatch = line.match(/Pool\s+([A-Za-z0-9]+)/i);
    if (poolMatch && !line.includes(' - ') && !line.toLowerCase().includes('vs')) {
      currentPool = `Pool ${poolMatch[1].toUpperCase()}`;
      continue;
    }

    const roundHeaderMatch = line.match(/^Round\s+(\d+)$/i);
    if (roundHeaderMatch) {
      currentRoundFallback = parseInt(roundHeaderMatch[1], 10);
      continue;
    }

    if (!currentPool) continue;
    if (line.toLowerCase().includes('fixture sheet')) continue;
    if (line.toLowerCase().includes('managed by')) continue;
    if (line.toLowerCase().includes('round results')) continue;
    if (line.toLowerCase().includes('match results')) continue;

    const fixture = parseFixtureRow(line, currentPool, currentRoundFallback);
    if (fixture) fixtures.push(fixture);
  }

  return fixtures;
}

function parseFixtureRow(line: string, poolName: string, fallbackRound: number): ParsedFixture | null {
  const parts = line.split('|').map((s) => s.trim()).filter(Boolean);

  if (parts.some((p) => p.toLowerCase() === 'home' || p.toLowerCase() === 'round' || p.toLowerCase() === '#')) {
    return null;
  }
  if (parts.some((p) => /^-+$/.test(p))) return null;

  let round = fallbackRound;
  let homeTeam = '';
  let awayTeam = '';
  let scoreStr = '';
  let statusStr = '';

  if (parts.length >= 5) {
    const roundMatch = parts[0].match(/(\d+)/);
    if (roundMatch) round = parseInt(roundMatch[1], 10);
    homeTeam = parts[1];
    scoreStr = parts[2];
    awayTeam = parts[3];
    statusStr = parts[4];
  } else if (parts.length === 4) {
    homeTeam = parts[0];
    scoreStr = parts[1];
    awayTeam = parts[2];
    statusStr = parts[3];
  } else {
    return null;
  }

  if (!homeTeam || !awayTeam) return null;

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let played = false;

  const scoreMatch = scoreStr.match(/(\d+)\s*-\s*(\d+)/);
  if (scoreMatch) {
    homeScore = parseInt(scoreMatch[1], 10);
    awayScore = parseInt(scoreMatch[2], 10);
    played = true;
  }

  return { poolName, round: round || 1, homeTeam, awayTeam, homeScore, awayScore, played };
}

function applyParsedFixtures(tournament: Tournament, parsed: ParsedFixture[]): Tournament {
  const updated = { ...tournament, fixtures: [...tournament.fixtures] };

  for (const pf of parsed) {
    const pool = updated.pools.find((p) => p.name.toLowerCase() === pf.poolName.toLowerCase());
    if (!pool) continue;

    const home = updated.teams.find((t) => t.name.toLowerCase() === pf.homeTeam.toLowerCase());
    const away = updated.teams.find((t) => t.name.toLowerCase() === pf.awayTeam.toLowerCase());
    if (!home || !away || home.id === away.id) continue;

    const exists = updated.fixtures.some(
      (f) => f.poolId === pool.id && f.homeTeamId === home.id && f.awayTeamId === away.id && f.round === pf.round,
    );

    if (exists) {
      if (pf.played) {
        updated.fixtures = updated.fixtures.map((f) => {
          if (f.poolId === pool.id && f.homeTeamId === home.id && f.awayTeamId === away.id && f.round === pf.round && !f.played) {
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
  }

  return updated;
}
