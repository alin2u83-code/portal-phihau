// tests/sold_vs_rest_faza44.ts
//
// Faza 44 (44-07, SC-03) — compara datoria implicita de sold (soldService.calculeazaSolduri, sold net per entitate)
// cu suma plati.suma_ramasa a facturilor neanulate ale entitatii, pe club. READ-ONLY (service role), tipareste doar numaratori.
// Clasificare diferente: avans (entitatea are tranzactii partial alocate) | G1 (factura Achitat fara alocare) | alte.
// REAL_CLUBS = id-uri de club separate prin virgula (optional); implicit toate cluburile se tipares ca atare.
//
// Rulare: npx tsx tests/sold_vs_rest_faza44.ts

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { calculeazaSolduri } from '../services/soldService';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const REAL = new Set((process.env.REAL_CLUBS ?? '').split(',').map((s) => s.trim()).filter(Boolean));

async function all(tabel: string, cols: string): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(tabel).select(cols).range(from, from + 999);
    if (error) throw new Error(`${tabel}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  const plati = await all('plati', 'id, sportiv_id, familie_id, club_id, suma, status, suma_ramasa');
  const tranz = await all('tranzactii', 'id, sportiv_id, familie_id, club_id, suma');
  const tp = await all('tranzactie_plata', 'tranzactie_id, plata_id, suma_alocata');
  const alocPlata = new Map<string, number>();
  const alocTranz = new Map<string, number>();
  for (const a of tp) {
    alocPlata.set(a.plata_id, (alocPlata.get(a.plata_id) ?? 0) + Number(a.suma_alocata));
    alocTranz.set(a.tranzactie_id, (alocTranz.get(a.tranzactie_id) ?? 0) + Number(a.suma_alocata));
  }
  const { perSportiv, perFamilie } = calculeazaSolduri(plati, tranz);
  const cheie = (o: any) => (o.familie_id ? `f:${o.familie_id}` : o.sportiv_id ? `s:${o.sportiv_id}` : null);
  const sold = (k: string) => (k.startsWith('f:') ? perFamilie.get(k.slice(2)) : perSportiv.get(k.slice(2))) ?? 0;

  const ent = new Map<string, { club: string | null; sumaRamasa: number; avans: boolean; g1: boolean }>();
  const get = (k: string, club: string | null) => {
    if (!ent.has(k)) ent.set(k, { club, sumaRamasa: 0, avans: false, g1: false });
    return ent.get(k)!;
  };
  for (const p of plati) {
    const k = cheie(p); if (!k) continue;
    const e = get(k, p.club_id);
    if (p.status === 'Anulat') continue;
    e.sumaRamasa += Number(p.suma_ramasa) || 0;
    if (p.status === 'Achitat' && Number(p.suma) > 0.01 && !alocPlata.has(p.id)) e.g1 = true;
  }
  for (const t of tranz) {
    const k = cheie(t); if (!k) continue;
    const e = get(k, t.club_id);
    if (Number(t.suma) - (alocTranz.get(t.id) ?? 0) > 0.005) e.avans = true;
  }

  const rez = new Map<string, { entitati: number; difera: number; avans: number; g1: number; alte: number }>();
  for (const [k, e] of ent) {
    const club = e.club ?? 'FARA_CLUB';
    const r = rez.get(club) ?? { entitati: 0, difera: 0, avans: 0, g1: 0, alte: 0 };
    r.entitati++;
    const datorieSold = Math.max(-sold(k), 0);
    if (Math.abs(datorieSold - e.sumaRamasa) > 0.01) {
      r.difera++;
      if (e.g1) r.g1++; else if (e.avans) r.avans++; else r.alte++;
    }
    rez.set(club, r);
  }
  for (const [club, r] of [...rez].sort()) {
    const tip = REAL.size ? (REAL.has(club) ? 'REAL' : 'TEST') : '-';
    console.log(`club=${club.slice(0, 8)} ${tip} entitati=${r.entitati} difera=${r.difera} (G1=${r.g1}, avans=${r.avans}, alte=${r.alte})`);
  }
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1); });
