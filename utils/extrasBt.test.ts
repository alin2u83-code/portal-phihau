/**
 * Test pentru utils/extrasBt.ts + distribuieSumaPeFacturi. Rulare: `npx tsx utils/extrasBt.test.ts`
 * Fixture ANONIMIZAT (date inventate): tests/fixtures/extras_bt_anonim.csv
 */
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import { parseazaExtrasBt, parseazaDescriereBt, parseSumaBt, clasificaCredit, gasesteCandidati,
  construiestePrevizualizare, eroareTabelLipsa, sumarPrevizualizare, tintaEfectiva, inFiltru, TOLERANTA_ZILE_DUPLICAT,
  randuriDeImportat, aprobaCotizatiiNoi } from './extrasBt';
import { distribuieSumaPeFacturi, restDePlata } from './paymentStatus';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

const text = readFileSync('tests/fixtures/extras_bt_anonim.csv', 'utf8');
const rows: string[][] = (Papa.parse(text, { header: false, skipEmptyLines: true }) as any).data;
const r = parseazaExtrasBt(rows);

// --- parser: structura generala
assert(r.iban_cont === 'RO49BTRL0000000000000001', 'iban_cont din antet');
assert(r.erori.length === 0, 'fara erori pe fixture');
assert(r.debite_ignorate === 2, 'debitele (plata + comision) ignorate si numarate');
assert(r.randuri.length === 9, 'doar creditele (9) in randuri');

assert(r.randuri[0].detalii === 'Abonament Ioana' && r.randuri[0].platitor_nume === 'POPESCU MARIA'
  && r.randuri[0].platitor_iban === 'RO82BRDE240SV00000000000' && r.randuri[0].suma === 220
  && r.randuri[0].data_tranzactie === '2026-10-01' && r.randuri[0].tip_probabil === 'cotizatie_probabila', 'credit Ioana parsat');
assert(r.randuri[1].detalii === 'Transfer abonament Radu septembrie' && r.randuri[1].platitor_nume === 'IONESCU ANA', 'descriere taiata lipita fara separator');
assert(r.randuri[2].platitor_nume === 'Mihai Georgescu' && r.randuri[2].suma === 900, 'plata familie 900');
assert(r.randuri[3].platitor_nume === null && r.randuri[3].platitor_iban === null && r.randuri[3].tip_probabil === 'numerar', 'ATM -> numerar, fara platitor');
assert(r.randuri[4].suma === 2000 && r.randuri[4].tip_probabil === 'firma', 'plata firma');
assert(r.randuri[5].tip_probabil === 'pos', 'Data entry carduri -> pos');

// --- ref_banca
const refs = r.randuri.map(x => x.ref_banca);
assert(refs[0] === 'REF0001' && refs[8] === 'REF0001#2', 'a doua aparitie a aceleiasi Referinta primeste #2');
assert(new Set(refs).size === refs.length, 'toate ref_banca distincte intra-fisier');
assert(refs[6].startsWith('h:') && refs[7].startsWith('h:') && refs[6] !== refs[7], 'doua randuri identice fara Referinta -> ref diferite (aparitia 1 vs 2)');
const r2 = parseazaExtrasBt(rows);
assert(r2.randuri[6].ref_banca === refs[6] && r2.randuri[7].ref_banca === refs[7], 'ref fallback identic la doua parsari');
const headerIdx = rows.findIndex(x => x[0] === 'Data tranzactie');
const rowsAlt = [...rows.slice(0, headerIdx + 1), ['01/10/2026', '01/10/2026', 'REFX', 'Plata', 'debit in plus', '5.00', ''], ...rows.slice(headerIdx + 1)];
const r3 = parseazaExtrasBt(rowsAlt);
assert(r3.randuri[6].ref_banca === refs[6] && r3.randuri[7].ref_banca === refs[7], 'ref fallback NU depinde de indexul randului');

// --- fisier fara antet
const gol = parseazaExtrasBt([['a', 'b'], ['c']]);
assert(gol.randuri.length === 0 && gol.erori.length > 0, 'fara rand "Data tranzactie" -> randuri [] si erori');

// --- parseSumaBt
assert(parseSumaBt('220.00') === 220, "parseSumaBt '220.00'");
assert(parseSumaBt('1,234.56') === 1234.56, "parseSumaBt '1,234.56'");
assert(parseSumaBt('1.234,56') === 1234.56, "parseSumaBt '1.234,56'");
assert(parseSumaBt('') === 0, "parseSumaBt ''");
assert(Number.isNaN(parseSumaBt('abc')), "parseSumaBt invalid -> NaN");

// --- parseazaDescriereBt / clasificaCredit
const pd = parseazaDescriereBt('Doar text fara platitor;');
assert(pd.platitor_nume === null && pd.detalii === 'Doar text fara platitor', 'descriere fara BIC/IBAN');
assert(clasificaCredit({ detalii: 'abonament specific', platitor_nume: 'ION POP', platitor_iban: 'RO12TEST0000000000000009' }) === 'cotizatie_probabila', "'specific' nu e CIF");

// --- gasesteCandidati
const sp = (id: string, nume: string, prenume: string, familie_id: string | null = null) => ({ id, nume, prenume, familie_id, club_id: 'c1' } as any);
const sportivi = [sp('s1', 'Popescu', 'Ioana'), sp('s2', 'Popescu', 'Maria'), sp('s3', 'Ionescu', 'Radu'),
  sp('s4', 'Georgescu', 'Mihai', 'f1'), sp('s5', 'Georgescu', 'Ana', 'f1')];
const familii = [{ id: 'f1', nume: 'Georgescu' }] as any;
const pl = (id: string, sportiv_id: string, suma: number, data: string, status = 'Neachitat') =>
  ({ id, sportiv_id, familie_id: null, suma, suma_ramasa: suma, status, data } as any);
const plati = [pl('p1', 's1', 220, '2026-10-01'), pl('p2', 's4', 300, '2026-09-01'), pl('p3', 's5', 600, '2026-10-01'), pl('p4', 's3', 100, '2026-10-01', 'Achitat')];
const cand1 = gasesteCandidati(r.randuri[0], { sportivi, familii, plati, memorie: [] });
assert(cand1[0].tip === 'sportiv' && cand1[0].id === 's1', 'Abonament Ioana + platitor POPESCU MARIA -> primul candidat Ioana Popescu');
assert(cand1.length > 1 && cand1.some(c => c.id === 's2'), 'se intoarce LISTA (si Maria Popescu apare), nu auto-alegere');
assert(cand1[0].facturiDeschise.length === 1 && cand1[0].sumaEgala === true, 'factura deschisa egala cu suma marcata');
const cand3 = gasesteCandidati(r.randuri[2], { sportivi, familii, plati, memorie: [] });
const fam = cand3.find(c => c.tip === 'familie' && c.id === 'f1');
assert(!!fam && fam.facturiDeschise.length === 2 && near(fam.restTotal, 900), 'familia Georgescu cu facturile membrilor (rest 900)');
const cand2 = gasesteCandidati(r.randuri[1], { sportivi, familii, plati, memorie: [{ club_id: 'c1', platitor_iban: 'RO83BRDE240SV11111111111', sportiv_id: 's3', familie_id: null }] });
const radu = cand2.find(c => c.id === 's3')!;
assert(!!radu && radu.motive.includes('iban_memorat'), 'IBAN din memorie -> iban_memorat');
assert(radu.facturiDeschise.length === 0, 'factura Achitat nu e deschisa');

// --- distribuieSumaPeFacturi vs algoritmul vechi din JurnalIncasari (referinta, copiat inainte de refactor)
function algoritmVechiJurnal(facturi: any[], suma: number, rest: (f: any) => number) {
  let ramas = suma;
  const out: { plata_id: string; suma_alocata: number }[] = [];
  const sorted = [...facturi].sort((a, b) => new Date((a.data || '').toString().slice(0, 10)).getTime() - new Date((b.data || '').toString().slice(0, 10)).getTime());
  for (const f of sorted) {
    if (ramas <= 0.001) break;
    const x = Math.min(rest(f), ramas);
    if (x > 0) { out.push({ plata_id: f.id, suma_alocata: x }); ramas -= x; }
  }
  return out;
}
const egale = (a: any[], b: any[]) => a.length === b.length && a.every((x, i) => x.plata_id === b[i].plata_id && near(x.suma_alocata, b[i].suma_alocata));
const F = [pl('b', 's1', 100, '2026-10-05'), pl('a', 's1', 80, '2026-09-01'), pl('c', 's1', 50, '2026-11-01'), pl('z', 's1', 70, '2026-08-01', 'Achitat')];
const cazuri: [string, number][] = [['cele mai vechi intai', 120], ['plata partiala pe ultima', 200], ['suma > total rest', 9999], ['rotunjire la bani', 33.334]];
for (const [nume, suma] of cazuri) {
  const nou = distribuieSumaPeFacturi(F, suma);
  assert(egale(nou, algoritmVechiJurnal(F, suma, restDePlata)), `distribuie identic cu algoritmul vechi: ${nume}`);
}
assert(distribuieSumaPeFacturi(F, 120)[0].plata_id === 'a', 'cele mai vechi intai (a, apoi b)');
assert(!distribuieSumaPeFacturi(F, 9999).some(x => x.plata_id === 'z'), 'facturi cu rest 0 sarite');
assert(near(distribuieSumaPeFacturi(F, 9999).reduce((s, x) => s + x.suma_alocata, 0), 230), 'suma > total rest -> total alocat = total rest');
const rot = distribuieSumaPeFacturi(F, 33.334);
assert(rot.every(x => Math.abs(x.suma_alocata * 100 - Math.round(x.suma_alocata * 100)) < 1e-9), 'alocari rotunjite la bani');

// --- previzualizare (fara salvare): date INVENTATE
const rb = (ref: string, suma: number, data: string, detalii: string) =>
  ({ ref_banca: ref, data_tranzactie: data, suma, platitor_nume: null, platitor_iban: null, detalii, tip_probabil: 'altele' } as any);
const tx = (id: string, sportiv_id: string | null, familie_id: string | null, suma: number, data: string) =>
  ({ id, sportiv_id, familie_id, suma, data_platii: data, metoda_plata: 'Transfer Bancar', plata_ids: [] } as any);
const ctxP = (tranzactii: any[], importate: any[] | null = []) => ({ sportivi, familii, plati, memorie: [], tranzactii, importate });
const rowIoana = rb('PV1', 150, '2026-10-10', 'Abonament Ioana Popescu');
const t1 = tx('t1', 's1', null, 150, '2026-10-12');

const p1 = construiestePrevizualizare([rowIoana], ctxP([t1]));
assert(p1[0].stare === 'posibil_duplicat' && p1[0].incasariSimilare.length === 1 && p1[0].incasariSimilare[0].id === 't1', 'T1 posibil duplicat: incasare similara (+2 zile)');
assert(TOLERANTA_ZILE_DUPLICAT === 3, 'toleranta implicita 3 zile');

const t1Far = tx('t1', 's1', null, 150, '2026-10-14');
assert(construiestePrevizualizare([rowIoana], ctxP([t1Far]))[0].stare === 'nou', 'T2 +4 zile -> nou');
assert(construiestePrevizualizare([rowIoana], ctxP([t1Far]), 5)[0].stare === 'posibil_duplicat', 'T2 toleranta 5 -> posibil duplicat');

assert(construiestePrevizualizare([rowIoana], ctxP([tx('t9', 's3', null, 150, '2026-10-10')]))[0].stare === 'nou', 'T3 alt sportiv (necandidat) -> nou');
assert(construiestePrevizualizare([rowIoana], ctxP([tx('t9', 's1', null, 200, '2026-10-10')]))[0].stare === 'nou', 'T4 suma diferita -> nou');

const rowFam = rb('PV2', 150, '2026-10-10', 'Abonament Mihai Georgescu');
const pFam = construiestePrevizualizare([rowFam], ctxP([tx('t5', null, 'f1', 150, '2026-10-10')]));
assert(pFam[0].candidati.some(c => c.id === 's4') && pFam[0].stare === 'posibil_duplicat', 'T5 candidat sportiv f1 + tranzactie pe familie f1 -> duplicat');
const rowFam2 = rb('PV3', 150, '2026-10-10', 'Familia Georgescu abonament');
const pFam2 = construiestePrevizualizare([rowFam2], ctxP([tx('t6', 's5', null, 150, '2026-10-11')]));
assert(pFam2[0].candidati.some(c => c.tip === 'familie' && c.id === 'f1') && pFam2[0].stare === 'posibil_duplicat', 'T5 candidat familie f1 + tranzactie pe membru -> duplicat');

const imp = { sursa: 'extras', ref_banca: 'PV1', stare: 'noua', tranzactie_id: null } as any;
const p6 = construiestePrevizualizare([rowIoana], ctxP([t1], [imp]));
assert(p6[0].stare === 'deja_importat' && p6[0].importat === imp, 'T6 deja importat are prioritate peste similar');

const impLegat = { sursa: 'extras', ref_banca: 'ALTUL', stare: 'confirmata', tranzactie_id: 't1' } as any;
assert(construiestePrevizualizare([rowIoana], ctxP([t1], [impLegat]))[0].stare === 'nou', 'T7 tranzactie creata din import nu e duplicat manual');

const p8 = construiestePrevizualizare([rowIoana], ctxP([t1], null));
assert(p8[0].importat === null && p8[0].stare === 'posibil_duplicat', 'T8 importate null: stare doar din (b), fara aruncare');

assert(eroareTabelLipsa('42P01: relation "public.tranzactii_bancare" does not exist') === true, 'T9 42P01');
assert(eroareTabelLipsa("Could not find the table 'public.tranzactii_bancare' in the schema cache") === true, 'T9 PGRST205');
assert(eroareTabelLipsa('permission denied for table tranzactii_bancare') === false && eroareTabelLipsa('') === false && eroareTabelLipsa(null) === false, 'T9 alte erori -> false');
assert(eroareTabelLipsa('column "iban" does not exist') === false && eroareTabelLipsa('function public.x() does not exist') === false, 'T9 coloana/functie lipsa != tabel lipsa');

// T12: verificare indisponibila (importuri/Jurnal in incarcare sau esuate) -> 'necunoscut', nu 'nou'
const ctxNec = { ...ctxP([t1Far]), verificareIndisponibila: true };
const pNec = construiestePrevizualizare([rowIoana], ctxNec);
assert(pNec[0].stare === 'necunoscut', 'T12 fara duplicat gasit + verificare indisponibila -> necunoscut');
assert(construiestePrevizualizare([rowIoana], { ...ctxP([t1]), verificareIndisponibila: true })[0].stare === 'posibil_duplicat', 'T12 duplicat gasit ramane duplicat');
assert(construiestePrevizualizare([rowIoana], { ...ctxP([t1], [imp]), verificareIndisponibila: true })[0].stare === 'deja_importat', 'T12 deja importat ramane deja importat');
const sNec = sumarPrevizualizare(pNec, {});
assert(sNec.noi === 0 && sNec.duplicate === 0 && sNec.necunoscute === 1 && near(sNec.sumaDeAplicat, 0), 'T12 necunoscut nu intra in Noi / Duplicate / de aplicat');
assert(inFiltru(pNec[0], undefined, 'toate') && !inFiltru(pNec[0], undefined, 'noi') && !inFiltru(pNec[0], undefined, 'duplicate'), 'T12 filtre: necunoscut doar in Toate');
assert(sumarPrevizualizare(pNec, { PV1: 'ignorat' }).necunoscute === 0, 'T12 necunoscut ignorat nu se numara');

const r4 = [
  rb('A', 100, '2026-10-01', 'Abonament Ioana Popescu'), // nou, candidat s1
  rb('B', 70, '2026-10-02', 'ceva fara nume'),            // nou, fara candidat
  rb('C', 150, '2026-10-10', 'Abonament Ioana Popescu'),  // posibil duplicat
  rb('D', 30, '2026-10-03', 'Abonament Ioana Popescu'),   // nou, ignorat
];
const p10 = construiestePrevizualizare(r4, ctxP([t1]));
const al: Record<string, any> = { D: 'ignorat' };
const s10 = sumarPrevizualizare(p10, al);
assert(s10.toate === 4 && s10.noi === 2 && s10.duplicate === 1 && s10.fara_potrivire === 1 && s10.ignorate === 1, 'T10 contoare');
assert(near(s10.sumaTotala, 350) && near(s10.sumaDeAplicat, 100), 'T10 suma totala / de aplicat');
const s10b = sumarPrevizualizare(p10, { ...al, B: { tip: 'sportiv', id: 's3' } });
assert(s10b.fara_potrivire === 0 && near(s10b.sumaDeAplicat, 170), 'T10 alegere manuala pe randul fara candidat');
assert(tintaEfectiva(p10[0], undefined)?.id === 's1' && tintaEfectiva(p10[0], 'ignorat') === null, 'tintaEfectiva: propunere / ignorat');
assert(inFiltru(p10[3], 'ignorat', 'ignorate') && !inFiltru(p10[3], 'ignorat', 'noi') && inFiltru(p10[3], 'ignorat', 'toate'), 'inFiltru ignorate');

// T13: aprobare per rand (doar ce e bifat, verificat si neignorat se importa)
const rc = (ref: string, tip: string, suma = 100) => ({ ...rb(ref, suma, '2026-10-20', 'x'), tip_probabil: tip });
const rowsA = construiestePrevizualizare([rc('N1', 'cotizatie_probabila'), rc('N2', 'numerar'), rc('N3', 'cotizatie_probabila'), rc('IMP', 'cotizatie_probabila')], ctxP([], [{ sursa: 'extras', ref_banca: 'IMP', stare: 'noua', tranzactie_id: null } as any]));
assert(rowsA.map(r => r.stare).join() === 'nou,nou,nou,deja_importat', 'T13 stari de baza');
assert(aprobaCotizatiiNoi(rowsA, {}).join() === 'N1,N3', 'T13 scurtatura: doar cotizatii noi (fara numerar, fara deja importat)');
assert(aprobaCotizatiiNoi(rowsA, { N1: 'ignorat' }).join() === 'N3', 'T13 scurtatura: ignorat exclus');
assert(randuriDeImportat(rowsA, new Set(['N1', 'N2', 'IMP']), {}).map(r => r.ref_banca).join() === 'N1,N2', 'T13 deja importat nu se importa chiar daca e aprobat');
assert(randuriDeImportat(rowsA, new Set(['N1', 'N3']), { N3: 'ignorat' }).map(r => r.ref_banca).join() === 'N1', 'T13 aprobat + ignorat -> exclus');
assert(randuriDeImportat(rowsA, new Set(), {}).length === 0, 'T13 nimic aprobat -> nimic de importat');
const rowsNec = construiestePrevizualizare([rc('K', 'cotizatie_probabila')], { ...ctxP([]), verificareIndisponibila: true });
assert(randuriDeImportat(rowsNec, new Set(['K']), {}).length === 0 && aprobaCotizatiiNoi(rowsNec, {}).length === 0, 'T13 necunoscut nu se importa si nu se aproba singur');
const rowsDup = construiestePrevizualizare([rowIoana], ctxP([t1]));
assert(randuriDeImportat(rowsDup, new Set(['PV1']), {}).length === 1 && aprobaCotizatiiNoi(rowsDup, {}).length === 0, 'T13 posibil duplicat: se poate aproba manual, nu prin scurtatura');

const inainte = JSON.stringify([r4, ctxP([t1])]);
construiestePrevizualizare(r4, ctxP([t1]));
assert(JSON.stringify([r4, ctxP([t1])]) === inainte, 'T11 puritate: intrarile nu se modifica');

console.log('Toate testele extrasBt au trecut.');
