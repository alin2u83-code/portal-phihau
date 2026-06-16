/**
 * exportFinanciar.ts
 * Funcții de export CSV (cu BOM UTF-8) și PDF (jsPDF + autoTable)
 * pentru listele de încasări din RaportFinanciar.
 */
import { IstoricPlataDetaliat } from '../types';

const fmtDate = (val?: string | null) => {
    if (!val) return '';
    const d = new Date(val.toString().slice(0, 10));
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ro-RO');
};

const fmtSum = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportIncasariCSV(
    data: IstoricPlataDetaliat[],
    filename = 'incasari.csv',
) {
    const BOM = '\uFEFF';
    const HEADER = ['Data Plată', 'Sportiv / Familie', 'Descriere', 'Metodă', 'Sumă (RON)'];

    const rows = data.map(t => [
        fmtDate(t.data_plata_string),
        t.nume_complet_sportiv ?? '',
        t.descriere,
        t.metoda_plata ?? '',
        fmtSum(t.suma_incasata),
    ]);

    const csv = [HEADER, ...rows]
        .map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
        )
        .join('\r\n');

    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function exportIncasariPDF(
    data: IstoricPlataDetaliat[],
    total: number,
    filename = 'incasari.pdf',
    titlu = 'Raport Încasări',
) {
    // Dynamic import — nu blochează bundle-ul inițial
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // ── Antet ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Club Qwan Ki Do', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(titlu, 14, 21);
    doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')} · ${data.length} înregistrări`, 14, 27);

    // ── Tabel ──
    autoTable(doc, {
        head: [['Data Plată', 'Sportiv / Familie', 'Descriere', 'Metodă', 'Sumă (RON)']],
        body: data.map(t => [
            fmtDate(t.data_plata_string),
            t.nume_complet_sportiv ?? '—',
            t.descriere,
            t.metoda_plata ?? '—',
            fmtSum(t.suma_incasata),
        ]),
        foot: [['', '', '', 'TOTAL', fmtSum(total)]],
        startY: 33,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59] as [number, number, number],
            lineColor: [226, 232, 240] as [number, number, number],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [99, 102, 241] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 9,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] as [number, number, number],
        },
        footStyles: {
            fillColor: [241, 245, 249] as [number, number, number],
            textColor: [30, 41, 59] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 10,
        },
        columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' },
        },
    });

    doc.save(filename);
}

// ─── RESTANȚE ─────────────────────────────────────────────────────────────────

export interface RestantaRow {
    sportiv_id: string;
    numeSportiv: string;
    sumaTotala: number;
    nrFacturi: number;
    ceaMaiVecheScadenta: string; // ISO YYYY-MM-DD sau ''
}

export function exportRestanteCSV(
    rows: RestantaRow[],
    clubNume = 'Club QwanKiDo',
    filename = 'restante.csv',
) {
    const BOM = '\uFEFF';
    const HEADER = ['Sportiv', 'Suma Totala (RON)', 'Nr Facturi', 'Cea Mai Veche Scadenta'];

    const csvRows = rows.map(r => [
        r.numeSportiv,
        fmtSum(r.sumaTotala),
        String(r.nrFacturi),
        r.ceaMaiVecheScadenta
            ? new Date(r.ceaMaiVecheScadenta).toLocaleDateString('ro-RO')
            : '',
    ]);

    const csv = [HEADER, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export async function exportRestantePDF(
    rows: RestantaRow[],
    clubNume = 'Club QwanKiDo',
    filename = 'restante.pdf',
) {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // ── Antet ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(clubNume, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Raport Restanțe', 14, 21);
    doc.text(
        `Generat: ${new Date().toLocaleDateString('ro-RO')} · ${rows.length} sportivi`,
        14, 27,
    );

    const totalSuma = rows.reduce((s, r) => s + r.sumaTotala, 0);
    const totalFacturi = rows.reduce((s, r) => s + r.nrFacturi, 0);

    autoTable(doc, {
        head: [['Sportiv', 'Sumă Totală (RON)', 'Nr. Facturi', 'Cea Mai Veche Scadență']],
        body: rows.map(r => [
            r.numeSportiv,
            fmtSum(r.sumaTotala),
            String(r.nrFacturi),
            r.ceaMaiVecheScadenta
                ? new Date(r.ceaMaiVecheScadenta).toLocaleDateString('ro-RO')
                : '—',
        ]),
        foot: [['TOTAL', fmtSum(totalSuma), String(totalFacturi), '']],
        startY: 33,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59] as [number, number, number],
            lineColor: [226, 232, 240] as [number, number, number],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [245, 158, 11] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 9,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] as [number, number, number],
        },
        footStyles: {
            fillColor: [241, 245, 249] as [number, number, number],
            textColor: [30, 41, 59] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 10,
        },
        columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' },
        },
    });

    doc.save(filename);
}
