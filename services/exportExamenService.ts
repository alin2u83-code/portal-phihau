import * as XLSX from 'xlsx';
import { SesiuneExamen, InscriereExamen, Grad } from '../types';

function formatData(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString('ro-RO');
}

function triggerDownload(wb: XLSX.WorkBook, filename: string) {
    const wbout = XLSX.write(wb, { bookType: 'xls', type: 'binary' });
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; i++) view[i] = wbout.charCodeAt(i) & 0xff;
    const blob = new Blob([buf], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function sortInscrieriByGrad(inscrieri: InscriereExamen[], grade: Grad[]): InscriereExamen[] {
    return [...inscrieri].sort((a, b) => {
        const gradA = grade.find(g => g.id === a.grad_sustinut_id);
        const gradB = grade.find(g => g.id === b.grad_sustinut_id);
        const ordA = gradA?.ordine ?? 0;
        const ordB = gradB?.ordine ?? 0;
        if (ordA !== ordB) return ordB - ordA;
        const numeA = (a.sportiv_nume || '').toLowerCase();
        const numeB = (b.sportiv_nume || '').toLowerCase();
        return numeA.localeCompare(numeB, 'ro-RO');
    });
}

export function generateNotare(
    sesiune: SesiuneExamen,
    inscrieri: InscriereExamen[],
    grade: Grad[],
    comisie: string[]
): void {
    const clubNume = sesiune.club_nume || '';
    const localitate = sesiune.locatie_nume || sesiune.localitate || '';
    const dataFormatata = formatData(sesiune.data || sesiune.data_examen || '');
    const sorted = sortInscrieriByGrad(inscrieri, grade);

    const rows: any[][] = [
        ['FEDERATIA ROMANA DE QWAN KI DO'],
        ['si metode traditionale vietnameze'],
        [],
        ['', '', `Examen de grad: Sesiunea ${sesiune.nume || ''} ${dataFormatata} - ${localitate}`],
        ['', '', `Club: ${clubNume}`],
        ['', '', `Data: ${dataFormatata}`],
        ['', '', `Localitatea: ${localitate}`],
        [],
        [],
        [],
        ['', '', `Comisia de examinare: ${comisie[0] || ''}`],
        ['', '', `                      ${comisie[1] || ''}`],
        ['', '', `                      ${comisie[2] || ''}`],
        [],
        ['Nr.', 'NUME  /  PRENUME', '', 'Club', 'Grad', 'Tehnica', 'Doc', 'Song', 'Thao', 'Nota'],
        ['', '', '', '', 'sustinut', 'individ.', 'Luyen', 'Doi', 'Quyen', 'generala'],
    ];

    sorted.forEach((ins, idx) => {
        const gradNume = ins.grad_sustinut || grade.find(g => g.id === ins.grad_sustinut_id)?.nume || '';
        rows.push([
            idx + 1,
            ins.sportiv_nume || '',
            ins.sportiv_prenume || '',
            '',
            gradNume,
            '', '', '', '', '',
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 10 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Total');

    const dateFisier = (sesiune.data || sesiune.data_examen || '').slice(0, 10).replace(/-/g, '.');
    triggerDownload(wb, `Fisa_Notare_${clubNume}_${dateFisier}.xls`);
}

export function generateValidare(
    sesiune: SesiuneExamen,
    inscrieri: InscriereExamen[],
    grade: Grad[],
    comisie: string[]
): void {
    const clubNume = sesiune.club_nume || '';
    const localitate = sesiune.locatie_nume || sesiune.localitate || '';
    const dataFormatata = formatData(sesiune.data || sesiune.data_examen || '');
    const sorted = sortInscrieriByGrad(inscrieri, grade);

    const rows: any[][] = [
        ['FEDERATIA ROMÂNĂ DE QWAN-KI-DO'],
        ['si metode traditionale vietnameze'],
        ['', '', '', '', '', '', 'Clubul sportiv'],
        ['', '', '', 'Tabelul examenelor locale', '', '', clubNume],
        ['', '', '', '', '', '', localitate],
        ['', comisie[0] || '', '', '', '', 'Data:', dataFormatata],
        ['Comisia de examinare:', comisie[1] || '', '', '', '', 'Localitatea:', localitate],
        ['', comisie[2] || ''],
        [],
        ['Nr.', 'Nume/Prenume Sportiv', '', 'Gradul sustinut', 'Admis/Respins', 'Contributia', '', 'Obs.'],
    ];

    sorted.forEach((ins, idx) => {
        const gradNume = ins.grad_sustinut || grade.find(g => g.id === ins.grad_sustinut_id)?.nume || '';
        const numeComplet = `${ins.sportiv_nume || ''} ${ins.sportiv_prenume || ''}`.trim();
        rows.push([idx + 1, numeComplet, '', gradNume, '', '', '', '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 4 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 4 },
        { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'T Ex locale');

    const dateFisier = (sesiune.data || sesiune.data_examen || '').slice(0, 10).replace(/-/g, '.');
    triggerDownload(wb, `Fisa_Validare_${clubNume}_${dateFisier}.xls`);
}
