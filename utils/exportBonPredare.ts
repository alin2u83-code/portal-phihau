import type { CerereProdusFull, ComandaProduseiFull } from '../types';

// ─── Export PDF Bon Predare per sportiv (CMD-07) ──────────────────────────────

export async function exportBonPredare(
  cerere: CerereProdusFull,
  clubNume: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Bon Predare Echipament', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(clubNume, 14, 23);

  // Info sportiv
  const sportivNume = cerere.sportiv_nume ?? '—';
  const dataText = new Date(cerere.created_at).toLocaleDateString('ro-RO');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(`Sportiv: ${sportivNume}`, 14, 31);
  doc.text(`Data: ${dataText}`, 14, 37);

  // Date produs
  const produs = cerere.varianta?.produs?.denumire ?? '—';
  const variantaParts = [
    cerere.varianta?.culoare ?? '',
    cerere.varianta?.marime ?? '',
  ].filter(Boolean);
  const varianta = variantaParts.length > 0 ? variantaParts.join(' ') : '—';
  const pretUnitar = cerere.varianta?.pret_vanzare ?? 0;
  const cantitate = cerere.cantitate ?? 1;
  const suma = pretUnitar * cantitate;

  autoTable(doc, {
    head: [['Produs', 'Variantă', 'Cantitate', 'Preț (RON)']],
    body: [[produs, varianta, cantitate, suma.toFixed(2)]],
    startY: 44,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 41, 59] as [number, number, number],
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    columnStyles: {
      3: { halign: 'right' as const },
    },
  });

  doc.save(`bon-predare-${cerere.id.slice(0, 8)}.pdf`);
}

// ─── Export Excel Furnizor — produse+cantități per comandă (CMD-07) ──────────

export async function exportExcelFurnizor(
  comanda: ComandaProduseiFull,
  clubNume: string
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  // Agregare cantități per variantă — prioritate iteme, fallback cereri
  type RandFurnizor = { Produs: string; Variantă: string; Cantitate: number; Club: string };
  let rows: RandFurnizor[] = [];

  if (comanda.iteme && comanda.iteme.length > 0) {
    rows = comanda.iteme.map(item => ({
      Produs: item.varianta?.produs?.denumire ?? '—',
      Variantă: [
        (item.varianta as { culoare?: string; marime?: string } | undefined)?.culoare ?? '',
        (item.varianta as { culoare?: string; marime?: string } | undefined)?.marime ?? '',
      ]
        .filter(Boolean)
        .join(' ') || '—',
      Cantitate: item.cantitate ?? 0,
      Club: clubNume,
    }));
  } else {
    // Agregare din cereri
    const acc: Record<string, RandFurnizor> = {};
    for (const cerere of comanda.cereri) {
      const key = cerere.varianta_id;
      const produs = cerere.varianta?.produs?.denumire ?? '—';
      const variantaParts = [
        cerere.varianta?.culoare ?? '',
        cerere.varianta?.marime ?? '',
      ].filter(Boolean);
      const varianta = variantaParts.length > 0 ? variantaParts.join(' ') : '—';
      if (!acc[key]) {
        acc[key] = { Produs: produs, Variantă: varianta, Cantitate: 0, Club: clubNume };
      }
      acc[key].Cantitate += cerere.cantitate ?? 1;
    }
    rows = Object.values(acc);
  }

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Comenzi Furnizor');
  writeFile(wb, `comanda-furnizor-${comanda.id.slice(0, 8)}.xlsx`);
}
