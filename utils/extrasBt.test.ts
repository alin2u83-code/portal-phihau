/**
 * Test pentru utils/extrasBt.ts + distribuieSumaPeFacturi. Rulare: `npx tsx utils/extrasBt.test.ts`
 * Fixture ANONIMIZAT (date inventate): tests/fixtures/extras_bt_anonim.csv
 */
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import { parseazaExtrasBt, parseazaDescriereBt, parseSumaBt, clasificaCredit, gasesteCandidati } from './extrasBt';
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

console.log('Toate testele extrasBt au trecut.');
