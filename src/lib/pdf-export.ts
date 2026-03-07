import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tournament } from './types';
import { calculateStandings, getTeamName } from './tournament-store';

function addHeader(doc: jsPDF, tournament: Tournament, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Tournament name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(tournament.name, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Manager
  if (tournament.managerName) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Managed by ${tournament.managerName}`, pageWidth / 2, y + 4, { align: 'center' });
    doc.setTextColor(0);
    y += 8;
  }

  return y + 4;
}

export function exportStandingsPDF(tournament: Tournament) {
  const doc = new jsPDF();
  let startY = addHeader(doc, tournament, 'Standings');

  tournament.pools.forEach((pool, idx) => {
    const standings = calculateStandings(tournament, pool.id);
    if (standings.length === 0) return;

    if (idx > 0) startY += 6;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(pool.name, 14, startY);
    startY += 2;

    autoTable(doc, {
      startY,
      head: [['#', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts']],
      body: standings.map((s, i) => [
        i + 1,
        s.teamName,
        s.played,
        s.won,
        s.drawn,
        s.lost,
        s.goalsFor,
        s.goalsAgainst,
        s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference,
        s.points,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 65, 148], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 'auto' },
        3: { halign: 'center', cellWidth: 'auto' },
        4: { halign: 'center', cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 'auto' },
        6: { halign: 'center', cellWidth: 'auto' },
        7: { halign: 'center', cellWidth: 'auto' },
        8: { halign: 'center', cellWidth: 'auto' },
        9: { halign: 'center', cellWidth: 'auto', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      didParseCell: (data) => {
        // Bold first place row
        if (data.section === 'body' && data.row.index === 0) {
          data.cell.styles.fillColor = [230, 240, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    startY = (doc as any).lastAutoTable.finalY + 4;

    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text('Tie-break: Points → Goal Difference → Goals For → Alphabetical', 14, startY);
    doc.setTextColor(0);
    startY += 8;

    // New page if running low on space
    if (startY > 250 && idx < tournament.pools.length - 1) {
      doc.addPage();
      startY = 15;
    }
  });

  doc.save(`${tournament.name}-standings.pdf`);
}

export function exportFixturesPDF(tournament: Tournament) {
  const doc = new jsPDF();
  let startY = addHeader(doc, tournament, 'Fixture Sheet');

  tournament.pools.forEach((pool, idx) => {
    const poolFixtures = tournament.fixtures
      .filter(f => f.poolId === pool.id)
      .sort((a, b) => a.round - b.round);

    if (poolFixtures.length === 0) return;

    if (idx > 0) startY += 6;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(pool.name, 14, startY);
    startY += 2;

    autoTable(doc, {
      startY,
      head: [['Round', 'Home', 'Score', 'Away', 'Status']],
      body: poolFixtures.map(f => [
        `Round ${f.round}`,
        getTeamName(tournament, f.homeTeamId),
        f.played ? `${f.homeScore} - ${f.awayScore}` : 'vs',
        getTeamName(tournament, f.awayTeamId),
        f.played ? 'Played' : 'Pending',
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 65, 148], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 'auto', fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
        4: { halign: 'center', cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = data.cell.raw as string;
          if (val === 'Played') {
            data.cell.styles.textColor = [34, 139, 34];
          } else {
            data.cell.styles.textColor = [180, 140, 20];
          }
        }
      },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    if (startY > 250 && idx < tournament.pools.length - 1) {
      doc.addPage();
      startY = 15;
    }
  });

  doc.save(`${tournament.name}-fixtures.pdf`);
}
