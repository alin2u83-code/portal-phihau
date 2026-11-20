import type { ExtrasBtParsat, Familie, MemorieIban, Plata, RandExtrasBt, Sportiv, TipProbabilCredit, Tranzactie, TranzactieBancara } from '../types';
import { isSimilar } from './csv';
import { restDePlata } from './paymentStatus';

// Parser pur pentru extras de cont BT (CSV) + potrivire candidați. Fără React/Supabase.
// Date bancare personale: nu se loghează, nu se trimit la AI/RAG.

/** '220.00'→220, '1,234.56'→1234.56, '1.234,56'→1234.56, ''→0, invalid→NaN. */
export function parseSumaBt(s: string): number {
  const t = (s ?? '').replace(/\s/g, '');
  if (t === '') return 0;
  const vi = t.indexOf(','), pu = t.indexOf('.');
  let n = t;
  if (vi >= 0 && pu >= 0) n = vi < pu ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  else if (vi >= 0) n = t.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(n) ? Number(n) : NaN;
}

const BIC = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const IBAN = /^(RO\d{2}[A-Z]{4}[A-Z0-9]{16}|[A-Z]{2}\d{2}[A-Z0-9]{10,30})$/;

/** Descrierea BT, citită DE LA DREAPTA: ...;NUME;IBAN;BIC; — textul liber poate fi tăiat în segmente (se lipește fără separator). */
export function parseazaDescriereBt(descriere: string) {
  const segs = (descriere ?? '').replace(/;\s*$/, '').split(';');
  const n = segs.length;
  if (n >= 3 && BIC.test(segs[n - 1].trim()) && IBAN.test(segs[n - 2].trim())) {
    return {
      detalii: segs.slice(0, n - 3).join('').trim(),
      platitor_nume: segs[n - 3].trim() || null,
      platitor_iban: segs[n - 2].trim(),
    };
  }
  return { detalii: segs.join('').trim(), platitor_nume: null, platitor_iban: null };
}

export function clasificaCredit(c: { detalii: string | null; platitor_nume: string | null; platitor_iban: string | null }): TipProbabilCredit {
  const d = c.detalii ?? '';
  if (/\bATM\b|numerar/i.test(d)) return 'numerar';
  if (/data entry carduri|\bPOS\b/i.test(d)) return 'pos';
  if (/\bC\.?\s*I\.?\s*F\b/i.test(d) || /\b(SRL|S\.R\.L|SA|PFA|II)\b/.test(c.platitor_nume ?? '')) return 'firma';
  if (c.platitor_nume && c.platitor_iban) return 'cotizatie_probabila';
  return 'altele';
}

/** FNV-1a 32-bit, hex. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function parseazaExtrasBt(rows: string[][]): ExtrasBtParsat {
  const out: ExtrasBtParsat = { iban_cont: null, randuri: [], debite_ignorate: 0, erori: [] };
  const cell = (row: string[], i: number) => (row?.[i] ?? '').toString().trim();

  const rContIdx = rows.findIndex(x => /^numar cont/i.test(cell(x, 0)));
  if (rContIdx >= 0) out.iban_cont = cell(rows[rContIdx], 1).replace(/\s/g, '').toUpperCase() || null;

  const h = rows.findIndex(x => cell(x, 0).toLowerCase() === 'data tranzactie');
  if (h < 0) { out.erori.push('Nu s-a găsit rândul de antet „Data tranzactie” — fișierul nu pare un extras BT.'); return out; }
  const hdr = rows[h].map(c => (c ?? '').toString().trim().toLowerCase());
  const col = (nume: string) => hdr.indexOf(nume);
  const [cData, cRef, cTip, cDesc, cDebit, cCredit] = ['data tranzactie', 'referinta', 'tip tranzactie', 'descriere', 'debit', 'credit'].map(col);
  if ([cData, cDesc, cDebit, cCredit].some(i => i < 0)) { out.erori.push('Antetul nu conține coloanele așteptate (Data tranzactie, Descriere, Debit, Credit).'); return out; }

  const refCount = new Map<string, number>();
  const tupluCount = new Map<string, number>();
  for (let i = h + 1; i < rows.length; i++) {
    const row = rows[i];
    const m = cell(row, cData).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) continue; // subsol / rând gol
    const credit = parseSumaBt(cell(row, cCredit));
    if (Number.isNaN(credit)) { out.erori.push(`Rândul ${i + 1}: sumă de credit invalidă.`); continue; }
    if (credit <= 0) {
      if (parseSumaBt(cell(row, cDebit)) > 0) out.debite_ignorate++;
      continue;
    }
    const data = `${m[3]}-${m[2]}-${m[1]}`;
    const descriere = cell(row, cDesc);
    const p = parseazaDescriereBt(descriere);
    const tip = cTip >= 0 ? cell(row, cTip) : '';
    const detalii = tip && tip.toLowerCase() !== 'incasare instant' ? `${tip} | ${p.detalii}` : p.detalii;

    const ref = cRef >= 0 ? cell(row, cRef) : '';
    let ref_banca: string;
    if (ref) {
      const k = (refCount.get(ref) ?? 0) + 1;
      refCount.set(ref, k);
      ref_banca = k === 1 ? ref : `${ref}#${k}`;
    } else {
      // shortcut: doua plati identice reale in extrase SEPARATE cu perioade suprapuse vor fi tratate ca aceeasi (k=1 in ambele); BT da Referinta la credite
      const tuplu = `${data}|${credit.toFixed(2)}|${descriere}`;
      const k = (tupluCount.get(tuplu) ?? 0) + 1;
      tupluCount.set(tuplu, k);
      ref_banca = `h:${fnv1a(`${tuplu}|${k}`)}`;
    }
    const rand: RandExtrasBt = {
      ref_banca, data_tranzactie: data, suma: credit,
      platitor_nume: p.platitor_nume, platitor_iban: p.platitor_iban, detalii,
      tip_probabil: 'altele',
    };
    rand.tip_probabil = clasificaCredit(rand);
    out.randuri.push(rand);
  }
  return out;
}

// ─── Potrivire candidați (U-05: doar listă, niciodată auto-alegere) ───────────

export interface CandidatPotrivire {
  tip: 'sportiv' | 'familie';
  id: string;
  eticheta: string;
  motive: string[];
  scor: number;
  facturiDeschise: Plata[];
  restTotal: number;
  sumaEgala: boolean;
}

const norm = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokeni = (s: string | null | undefined) => norm(s).split(' ').filter(Boolean);

/** Facturile cu rest > 0 ale unui sportiv sau ale unei familii (inclusiv ale membrilor ei), cele mai vechi primele. */
export function facturiDeschisePentru(tip: 'sportiv' | 'familie', id: string, sportivi: Sportiv[], plati: Plata[]): Plata[] {
  const membri = tip === 'familie' ? new Set(sportivi.filter(s => s.familie_id === id).map(s => s.id)) : null;
  return plati
    .filter(p => restDePlata(p) > 0.001 && (tip === 'sportiv' ? p.sportiv_id === id : p.familie_id === id || (!!p.sportiv_id && membri!.has(p.sportiv_id))))
    .sort((a, b) => (a.data || '').toString().slice(0, 10).localeCompare((b.data || '').toString().slice(0, 10)));
}

const LUNI_RO = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

/** Dacă detaliile numesc o lună, alocarea merge DOAR pe facturile din acea lună (după „descriere”); restul sumei nu se aplică nicăieri.
 *  Fără lună în detalii sau fără factură din luna respectivă: toate facturile (cea mai veche întâi), ca înainte. */
export function facturiDeAlocat(facturi: Plata[], detalii: string | null, dataIncasare?: string | null): { facturi: Plata[]; dupaLuna: boolean } {
  const d = norm(detalii ?? '');
  const luni = LUNI_RO.filter(l => new RegExp(`\\b${l}\\b`).test(d));
  if (luni.length === 0) return { facturi, dupaLuna: false };
  // Anul țintă: cel scris în detalii, altfel anul încasării. „mai” rămâne lună (decizia userului).
  const anTinta = d.match(/\b(20\d\d)\b/)?.[1] ?? (dataIncasare ? String(dataIncasare).slice(0, 4) : null);
  const doarLuna = facturi.filter(f => {
    const t = norm((f as any).descriere ?? '');
    if (!luni.some(l => new RegExp(`\\b${l}\\b`).test(t))) return false;
    if (!anTinta) return true;
    const anFactura = t.match(/\b(20\d\d)\b/)?.[1] ?? String(f.data ?? '').slice(0, 4);
    return anFactura === anTinta;
  });
  return doarLuna.length > 0 ? { facturi: doarLuna, dupaLuna: true } : { facturi, dupaLuna: false };
}

export function gasesteCandidati(
  tb: { suma: number; platitor_nume: string | null; platitor_iban: string | null; detalii: string | null },
  ctx: { sportivi: Sportiv[]; familii: Familie[]; plati: Plata[]; memorie: MemorieIban[] }
): CandidatPotrivire[] {
  const dTok = tokeni(tb.detalii);
  const dCompact = dTok.join('');
  const pTok = tokeni(tb.platitor_nume);
  const pNorm = pTok.join(' ');

  const inDetalii = (t: string) => t.length >= 3 && (dTok.includes(t) || (t.length >= 5 && dTok.some(x => x.length >= 5 && isSimilar(x, t))));
  const toateInDetalii = (nume: string) => { const t = tokeni(nume); return t.length > 0 && t.every(inDetalii); };

  const acc = new Map<string, { tip: 'sportiv' | 'familie'; id: string; eticheta: string; motive: Map<string, number> }>();
  const adauga = (tip: 'sportiv' | 'familie', id: string, eticheta: string, motiv: string, scor: number) => {
    const key = `${tip}:${id}`;
    const c = acc.get(key) ?? { tip, id, eticheta, motive: new Map() };
    c.motive.set(motiv, scor);
    acc.set(key, c);
  };
  const sportivPeId = new Map(ctx.sportivi.map(s => [s.id, s]));
  const familiePeId = new Map(ctx.familii.map(f => [f.id, f]));
  const etSp = (s: Sportiv) => `${s.nume} ${s.prenume}`;
  const etFam = (f: Familie) => `Familia ${f.nume}`;
  const numeFam = (f: Familie) => tokeni(f.nume).filter(t => t !== 'familia' && t !== 'fam').join(' ');

  for (const s of ctx.sportivi) {
    const n = norm(s.nume), p = norm(s.prenume);
    if (!n || !p) continue;
    const compact1 = (n + p).replace(/ /g, ''), compact2 = (p + n).replace(/ /g, '');
    if ((compact1.length >= 6 && (dCompact.includes(compact1) || dCompact.includes(compact2))) || (toateInDetalii(s.nume) && toateInDetalii(s.prenume))) {
      adauga('sportiv', s.id, etSp(s), 'nume_in_detalii', 3);
    } else if (toateInDetalii(s.prenume) && tokeni(s.nume).some(t => pTok.includes(t))) {
      adauga('sportiv', s.id, etSp(s), 'prenume_detalii_nume_platitor', 3);
    }
    if (pNorm && (pNorm === `${n} ${p}` || pNorm === `${p} ${n}`)) adauga('sportiv', s.id, etSp(s), 'nume_platitor', 2);
    else if (pTok.length > 0 && tokeni(s.nume).every(t => pTok.includes(t))) adauga('sportiv', s.id, etSp(s), 'nume_familie_platitor', 1);
  }
  for (const f of ctx.familii) {
    const nf = numeFam(f);
    if (!nf) continue;
    if (toateInDetalii(nf)) adauga('familie', f.id, etFam(f), 'nume_familie_detalii', 3);
    else if (pTok.length > 0 && nf.split(' ').every(t => pTok.includes(t))) adauga('familie', f.id, etFam(f), 'nume_familie_platitor', 1);
  }
  if (tb.platitor_iban) {
    for (const m of ctx.memorie) {
      if (m.platitor_iban !== tb.platitor_iban) continue;
      const s = m.sportiv_id ? sportivPeId.get(m.sportiv_id) : undefined;
      const f = m.familie_id ? familiePeId.get(m.familie_id) : undefined;
      if (s) adauga('sportiv', s.id, etSp(s), 'iban_memorat', 2);
      else if (f) adauga('familie', f.id, etFam(f), 'iban_memorat', 2);
    }
  }

  const rezultat: CandidatPotrivire[] = [];
  for (const c of acc.values()) {
    const facturi = facturiDeschisePentru(c.tip, c.id, ctx.sportivi, ctx.plati);
    const restTotal = facturi.reduce((s, p) => s + restDePlata(p), 0);
    const sumaEgala = Math.abs(restTotal - tb.suma) < 0.005 || facturi.some(p => Math.abs(restDePlata(p) - tb.suma) < 0.005);
    const scoruri = [...c.motive.values()];
    const scor = Math.max(...scoruri) + (scoruri.length - 1) + (sumaEgala ? 1 : 0);
    rezultat.push({ tip: c.tip, id: c.id, eticheta: c.eticheta, motive: [...c.motive.keys()], scor, facturiDeschise: facturi, restTotal, sumaEgala });
  }
  return rezultat.sort((a, b) => b.scor - a.scor || a.eticheta.localeCompare(b.eticheta)).slice(0, 8);
}

// ─── Previzualizare (fără salvare) ────────────────────────────────────────────
// Funcții pure: ce există deja în aplicație pentru fiecare credit din fișier. Nu scriu nimic nicăieri.

/** Toleranță (zile) între data din extras și data încasării din Jurnal pentru „posibil duplicat”. */
export const TOLERANTA_ZILE_DUPLICAT = 3;

/** Serviciul întoarce doar mesajul erorii (fără cod), deci tabelul lipsă se detectează pe text. */
export function eroareTabelLipsa(msg: string | null | undefined): boolean {
  // `relation ... does not exist`, nu „does not exist” simplu: „column/function ... does not exist” nu înseamnă migrare neaplicată.
  return /42P01|PGRST205|relation\b.*does not exist|could not find the table/i.test(msg ?? '');
}

/** 'necunoscut' = nu s-a putut verifica (importuri/Jurnal în încărcare sau eșuate): nu se afirmă „Nou”. */
export type StarePrevizualizare = 'nou' | 'deja_importat' | 'posibil_duplicat' | 'necunoscut';

export interface RandPrevizualizare {
  rand: RandExtrasBt;
  candidati: CandidatPotrivire[];
  importat: TranzactieBancara | null;
  incasariSimilare: Tranzactie[];
  stare: StarePrevizualizare;
}

const ZI_MS = 86400000;
const ziUtc = (s: string | null | undefined): number => {
  const m = (s ?? '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
};

// shortcut: o încasare manuală poate fi raportată la mai multe rânduri bancare (fără pereche 1:1); acceptabil pentru un avertisment.
export function incasariSimilare(
  rand: { suma: number; data_tranzactie: string },
  candidati: CandidatPotrivire[],
  sportivi: Sportiv[],
  tranzactii: Tranzactie[],
  excluse: Set<string>,
  tolerantaZile: number = TOLERANTA_ZILE_DUPLICAT,
): Tranzactie[] {
  if (candidati.length === 0) return [];
  const S = new Set<string>(), F = new Set<string>();
  for (const c of candidati) {
    if (c.tip === 'sportiv') {
      S.add(c.id);
      const fid = sportivi.find(s => s.id === c.id)?.familie_id;
      if (fid) F.add(fid);
    } else {
      F.add(c.id);
      for (const s of sportivi) if (s.familie_id === c.id) S.add(s.id);
    }
  }
  const dRand = ziUtc(rand.data_tranzactie);
  return tranzactii
    .map(t => ({ t, zile: Math.abs(ziUtc(t.data_platii) - dRand) / ZI_MS }))
    .filter(({ t, zile }) =>
      !excluse.has(t.id) && Math.abs(t.suma - rand.suma) < 0.005 && zile <= tolerantaZile
      && ((!!t.sportiv_id && S.has(t.sportiv_id)) || (!!t.familie_id && F.has(t.familie_id))))
    .sort((a, b) => a.zile - b.zile)
    .map(x => x.t);
}

export function construiestePrevizualizare(
  randuri: RandExtrasBt[],
  ctx: { sportivi: Sportiv[]; familii: Familie[]; plati: Plata[]; memorie: MemorieIban[]; tranzactii: Tranzactie[]; importate: TranzactieBancara[] | null; verificareIndisponibila?: boolean },
  tolerantaZile: number = TOLERANTA_ZILE_DUPLICAT,
): RandPrevizualizare[] {
  const peRef = new Map<string, TranzactieBancara>();
  const excluse = new Set<string>();
  for (const i of ctx.importate ?? []) {
    if (i.sursa === 'extras') peRef.set(i.ref_banca, i);
    if (i.tranzactie_id) excluse.add(i.tranzactie_id); // create din confirmări bancare, nu introduse manual
  }
  const peSuma = new Map<number, Tranzactie[]>();
  for (const t of ctx.tranzactii) {
    const k = Math.round(t.suma * 100);
    const b = peSuma.get(k);
    if (b) b.push(t); else peSuma.set(k, [t]);
  }
  return randuri.map(rand => {
    const candidati = gasesteCandidati(rand, ctx);
    const importat = peRef.get(rand.ref_banca) ?? null;
    const similare = incasariSimilare(rand, candidati, ctx.sportivi, peSuma.get(Math.round(rand.suma * 100)) ?? [], excluse, tolerantaZile);
    return { rand, candidati, importat, incasariSimilare: similare, stare: importat ? 'deja_importat' : similare.length ? 'posibil_duplicat' : ctx.verificareIndisponibila ? 'necunoscut' : 'nou' };
  });
}

export type AlegereRand = { tip: 'sportiv' | 'familie'; id: string } | 'ignorat';

export function tintaEfectiva(r: RandPrevizualizare, alegere?: AlegereRand): { tip: 'sportiv' | 'familie'; id: string } | null {
  if (alegere === 'ignorat') return null;
  if (alegere) return alegere;
  const c = r.candidati[0];
  return c ? { tip: c.tip, id: c.id } : null;
}

export type FiltruPrevizualizare = 'toate' | 'noi' | 'duplicate' | 'fara_potrivire' | 'ignorate';

export function inFiltru(r: RandPrevizualizare, alegere: AlegereRand | undefined, filtru: FiltruPrevizualizare): boolean {
  const ignorat = alegere === 'ignorat';
  if (filtru === 'toate') return true;
  if (filtru === 'ignorate') return ignorat;
  if (ignorat) return false;
  if (filtru === 'noi') return r.stare === 'nou';
  if (filtru === 'duplicate') return r.stare === 'deja_importat' || r.stare === 'posibil_duplicat';
  return tintaEfectiva(r, alegere) === null;
}

/** Rândurile care se importă: aprobate, neignorate, nici deja importate, nici neverificate. Aprobarea nu alege ținta; confirmarea ca încasare e separată. */
export function randuriDeImportat(rows: RandPrevizualizare[], aprobate: Set<string>, alegeri: Record<string, AlegereRand>): RandExtrasBt[] {
  return rows
    .filter(r => aprobate.has(r.rand.ref_banca) && alegeri[r.rand.ref_banca] !== 'ignorat' && (r.stare === 'nou' || r.stare === 'posibil_duplicat'))
    .map(r => r.rand);
}

/** ref_banca ale cotizațiilor noi (verificate, neignorate): scurtătura „Aprobă cotizațiile noi”. Duplicatele și numerarul/POS/firma nu se aprobă singure. */
export function aprobaCotizatiiNoi(rows: RandPrevizualizare[], alegeri: Record<string, AlegereRand>): string[] {
  return rows
    .filter(r => r.stare === 'nou' && r.rand.tip_probabil === 'cotizatie_probabila' && alegeri[r.rand.ref_banca] !== 'ignorat')
    .map(r => r.rand.ref_banca);
}

const bani = (x: number) => Math.round(x * 100) / 100;

export function sumarPrevizualizare(rows: RandPrevizualizare[], alegeri: Record<string, AlegereRand>) {
  const o = { toate: 0, noi: 0, duplicate: 0, fara_potrivire: 0, ignorate: 0, necunoscute: 0, sumaTotala: 0, sumaDeAplicat: 0 };
  for (const r of rows) {
    const al = alegeri[r.rand.ref_banca];
    o.toate++;
    o.sumaTotala += r.rand.suma;
    if (inFiltru(r, al, 'noi')) o.noi++;
    if (inFiltru(r, al, 'duplicate')) o.duplicate++;
    if (inFiltru(r, al, 'fara_potrivire')) o.fara_potrivire++;
    if (inFiltru(r, al, 'ignorate')) o.ignorate++;
    if (al !== 'ignorat' && r.stare === 'necunoscut') o.necunoscute++;
    if (al !== 'ignorat' && r.stare === 'nou' && tintaEfectiva(r, al)) o.sumaDeAplicat += r.rand.suma;
  }
  o.sumaTotala = bani(o.sumaTotala);
  o.sumaDeAplicat = bani(o.sumaDeAplicat);
  return o;
}
