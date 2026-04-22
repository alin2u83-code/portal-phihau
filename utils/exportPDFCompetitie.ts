import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Competitie } from '../types';

export interface RandIndividualPDF {
  numeComplet: string;
  categorie: string;
  proba: string;
  inlantuireArma: string;
  grad: string;
  taxa: number;
}

export interface RandEchipaPDF {
  numeEchipa: string;
  categorie: string;
  titulari: string;
  rezerve: string;
  taxa: number;
  incompleta: boolean;
}

const HEAD_FILL: [number, number, number] = [30, 41, 59];
const HEAD_TEXT: [number, number, number] = [248, 250, 252];

function headerCompetitie(doc: jsPDF, titlu: string, competitie: Competitie, numeClub: string): number {
  const dataComp = competitie.data_inceput
    ? format(new Date(competitie.data_inceput), 'dd.MM.yyyy', { locale: ro })
    : '—';

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(titlu, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(competitie.denumire ?? 'Competitie', 105, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Club: ${numeClub}`, 14, 40);
  doc.text(`Data: ${dataComp}`, 14, 46);
  if (competitie.locatie) {
    doc.text(`Locatie: ${competitie.locatie}`, 14, 52);
    return 60;
  }
  return 54;
}

function ensureSpace(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 270) {
    doc.addPage();
    return 20;
  }
  return y;
}

function semnatura(doc: jsPDF, y: number) {
  y = ensureSpace(doc, y, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Reprezentant club: ________________________', 14, y);
  doc.text('Casier: ________________________', 120, y);
  y += 8;
  doc.text('Semnatura: ________________________', 14, y);
  doc.text('Semnatura: ________________________', 120, y);
}

export function exportFisaParticipare(
  competitie: Competitie,
  numeClub: string,
  randuriIndividuale: RandIndividualPDF[],
  randuriEchipe: RandEchipaPDF[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = headerCompetitie(doc, 'FISA DE PARTICIPARE', competitie, numeClub);

  if (randuriIndividuale.length > 0) {
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Inscrieri individuale', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Nr.', 'Sportiv', 'Categorie', 'Proba', 'Inlantuire / Arma', 'Grad']],
      body: randuriIndividuale.map((r, i) => [
        String(i + 1), r.numeComplet, r.categorie, r.proba, r.inlantuireArma, r.grad,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 } },
    });
    // @ts-expect-error jspdf-autotable adds lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 8;
  }

  if (randuriEchipe.length > 0) {
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Echipe', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Nr.', 'Echipa', 'Categorie', 'Titulari', 'Rezerve']],
      body: randuriEchipe.map((r, i) => [
        String(i + 1), r.numeEchipa + (r.incompleta ? ' *' : ''), r.categorie, r.titulari, r.rezerve,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 } },
    });
    // @ts-expect-error jspdf-autotable adds lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 8;
  }

  y = ensureSpace(doc, y, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total sportivi: ${randuriIndividuale.length}  |  Total echipe: ${randuriEchipe.length}`, 14, y);
  y += 10;
  semnatura(doc, y);

  const numeFisier = `fisa_participare_${numeClub.replace(/\s+/g, '_')}.pdf`;
  doc.save(numeFisier);
}

export function exportBorderoClub(
  competitie: Competitie,
  numeClub: string,
  randuriIndividuale: RandIndividualPDF[],
  randuriEchipe: RandEchipaPDF[],
  totalIndividual: number,
  totalEchipe: number,
  totalGeneral: number,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = headerCompetitie(doc, 'BORDEROU INSCRIERE', competitie, numeClub);

  if (randuriIndividuale.length > 0) {
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Inscrieri individuale', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Nr.', 'Sportiv', 'Categorie', 'Proba', 'Taxa (lei)']],
      body: randuriIndividuale.map((r, i) => [
        String(i + 1), r.numeComplet, r.categorie, r.proba, String(r.taxa),
      ]),
      foot: [['', '', '', 'Subtotal individual:', `${totalIndividual} lei`]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
      footStyles: { fillColor: [15, 23, 42] as [number,number,number], textColor: [134, 239, 172] as [number,number,number], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 }, 4: { halign: 'right' } },
    });
    // @ts-expect-error jspdf-autotable adds lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 8;
  }

  if (randuriEchipe.length > 0) {
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Echipe', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Nr.', 'Echipa', 'Categorie', 'Componenti', 'Taxa (lei)']],
      body: randuriEchipe.map((r, i) => [
        String(i + 1),
        r.numeEchipa,
        r.categorie,
        [r.titulari, r.rezerve ? `R: ${r.rezerve}` : ''].filter(Boolean).join(' | '),
        r.incompleta ? `~${r.taxa}*` : String(r.taxa),
      ]),
      foot: [['', '', '', 'Subtotal echipe:', `${totalEchipe} lei`]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
      footStyles: { fillColor: [15, 23, 42] as [number,number,number], textColor: [134, 239, 172] as [number,number,number], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 }, 4: { halign: 'right' } },
    });
    // @ts-expect-error jspdf-autotable adds lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 8;
  }

  // Total box
  y = ensureSpace(doc, y, 30);
  doc.setDrawColor(100, 116, 139);
  const boxH = (randuriIndividuale.length > 0 ? 7 : 0) + (randuriEchipe.length > 0 ? 7 : 0) + 10;
  doc.rect(14, y, 182, boxH);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (randuriIndividuale.length > 0) {
    doc.text(`Total inscrieri individuale: ${totalIndividual} lei`, 20, y);
    y += 6;
  }
  if (randuriEchipe.length > 0) {
    doc.text(`Total echipe: ${totalEchipe} lei`, 20, y);
    y += 6;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL DE ACHITAT: ${totalGeneral} lei`, 20, y);
  y += 12;

  if (randuriEchipe.some(r => r.incompleta)) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setFont('helvetica', 'normal');
    doc.text('* Echipa incompleta — taxa estimata, se confirma dupa completarea echipei.', 14, y);
    y += 8;
  }

  y += 4;
  semnatura(doc, y);

  const numeFisier = `borderou_${numeClub.replace(/\s+/g, '_')}.pdf`;
  doc.save(numeFisier);
}
