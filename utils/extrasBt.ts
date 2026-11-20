import type { ExtrasBtParsat, Familie, MemorieIban, Plata, RandExtrasBt, Sportiv, TipProbabilCredit } from '../types';
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

  const deschise = ctx.plati.filter(p => restDePlata(p) > 0.001);
  const rezultat: CandidatPotrivire[] = [];
  for (const c of acc.values()) {
    const membri = c.tip === 'familie' ? new Set(ctx.sportivi.filter(s => s.familie_id === c.id).map(s => s.id)) : null;
    const facturi = deschise
      .filter(p => (c.tip === 'sportiv' ? p.sportiv_id === c.id : p.familie_id === c.id || (!!p.sportiv_id && membri!.has(p.sportiv_id))))
      .sort((a, b) => (a.data || '').toString().slice(0, 10).localeCompare((b.data || '').toString().slice(0, 10)));
    const restTotal = facturi.reduce((s, p) => s + restDePlata(p), 0);
    const sumaEgala = Math.abs(restTotal - tb.suma) < 0.005 || facturi.some(p => Math.abs(restDePlata(p) - tb.suma) < 0.005);
    const scoruri = [...c.motive.values()];
    const scor = Math.max(...scoruri) + (scoruri.length - 1) + (sumaEgala ? 1 : 0);
    rezultat.push({ tip: c.tip, id: c.id, eticheta: c.eticheta, motive: [...c.motive.keys()], scor, facturiDeschise: facturi, restTotal, sumaEgala });
  }
  return rezultat.sort((a, b) => b.scor - a.scor || a.eticheta.localeCompare(b.eticheta)).slice(0, 8);
}
