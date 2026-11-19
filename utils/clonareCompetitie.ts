/**
 * Faza 45: clonare competiție — logică pură (fără Supabase/React).
 * Structura inițială a categoriilor se reconstruiește DOAR aici; RPC-ul competitie_cloneaza
 * primește id-urile rezultate și doar le validează și le copiază.
 */

import type { AvertismentClonare, CategorieCompetitie, ProbaCompetitie, TipCompetitie } from '../types';
import { DEFAULT_PROBE_PER_TIP } from './competitiiTemplates';

// Niciodată 'stagiu' (A1 din 45-01): doar tipurile cu set de probe definit.
export const TIPURI_CLONARE = Object.keys(DEFAULT_PROBE_PER_TIP) as TipCompetitie[];

// Există două forme de fuziune: veche (20260412, pe loc, categoria rămâne activă și se referă și pe ea însăși)
// și Faza 41 (RPC: rând nou cu sursele marcate 'fuzionata'); aceasta e singura implementare, RPC-ul copiază aceste id-uri.
export function structuraInitiala(cats: CategorieCompetitie[]): { ids: string[]; excluse: string[]; avertismente: AvertismentClonare[]; anulate: number } {
  const existente = new Set(cats.map(c => c.id));
  const excluse = new Set<string>();
  const avertismente: AvertismentClonare[] = [];
  const avertizeaza = (c: CategorieCompetitie, mesaj: string) => avertismente.push({ categorieId: c.id, numar: c.numar_categorie ?? null, mesaj });

  for (const c of cats) {
    const surse = (c.categorii_fuzionate_din ?? []).filter(Boolean) as string[];
    if (c.status_categorie === 'impartita') {
      surse.forEach(id => excluse.add(id)); // copiii împărțirii
      if (c.este_fuzionata) {
        excluse.add(c.id);
        avertizeaza(c, 'Rezultat de fuziune împărțit ulterior; se copiază sursele fuziunii, verifică în draft.');
      } else if (!surse.some(id => existente.has(id))) {
        excluse.add(c.id);
        avertizeaza(c, 'Împărțire fără categorii rezultate identificabile; se copiază variantele active.');
      }
    } else if (c.este_fuzionata) {
      const veche = surse.length === 0 || surse.includes(c.id) || surse.some(id => !existente.has(id));
      if (veche) {
        surse.filter(id => id !== c.id && existente.has(id)).forEach(id => excluse.add(id));
        avertizeaza(c, 'Fuziune veche: definiția inițială nu se poate reconstrui; se copiază varianta fuzionată.');
      } else {
        excluse.add(c.id); // Faza 41: rezultatul iese, sursele rămân
      }
    }
  }

  const incluse = cats.filter(c => !excluse.has(c.id));
  return {
    ids: incluse.map(c => c.id),
    excluse: cats.filter(c => excluse.has(c.id)).map(c => c.id),
    avertismente,
    anulate: incluse.filter(c => c.status_categorie === 'anulata').length,
  };
}

// Aceeași regulă la schimbarea tipului (D-11/D-12); la același tip nu avertizăm (A7: o competiție 'tehnica' poate avea probă giao_dau).
export function avertismenteTip(tipSursa: TipCompetitie, tipTinta: TipCompetitie, probe: ProbaCompetitie[], cats: CategorieCompetitie[], ids: string[]): { probe: ProbaCompetitie[]; categorii: number } {
  if (tipSursa === tipTinta) return { probe: [], categorii: 0 };
  const compatibile = new Set((DEFAULT_PROBE_PER_TIP[tipTinta] ?? []).map(p => p.tip_proba));
  const incompatibile = probe.filter(p => !compatibile.has(p.tip_proba));
  const idProbe = new Set(incompatibile.map(p => p.id));
  const selectate = new Set(ids);
  return { probe: incompatibile, categorii: cats.filter(c => selectate.has(c.id) && idProbe.has(c.proba_id)).length };
}

export function numeImplicit(denumire: string): string {
  const nume = denumire.trim();
  const nou = nume.replace(/\b(19|20)\d{2}\b/g, a => String(+a + 1));
  return nou === nume ? `${nume} (copie)` : nou;
}

// Aceleași reguli ca RPC-ul competitie_cloneaza (nume unic case-insensitive, tip, date); datele ISO se compară lexicografic.
export function valideazaClonare(f: { denumire: string; tip: string; dataInceput: string; dataSfarsit: string; deadline: string }, numeExistente: string[]): string[] {
  const erori: string[] = [];
  const nume = f.denumire.trim();
  if (nume.length < 1 || nume.length > 200) erori.push('Denumirea trebuie să aibă între 1 și 200 de caractere.');
  else if (numeExistente.some(n => n.trim().toLowerCase() === nume.toLowerCase())) erori.push('Există deja o competiție cu această denumire.');
  if (!TIPURI_CLONARE.includes(f.tip as TipCompetitie)) erori.push('Tipul competiției nu este valid.');
  if (!f.dataInceput || !f.dataSfarsit || !f.deadline) {
    erori.push('Completează data de început, data de sfârșit și termenul limită de înscriere.');
  } else {
    if (f.dataSfarsit < f.dataInceput) erori.push('Data de sfârșit nu poate fi înainte de data de început.');
    if (f.deadline > f.dataInceput) erori.push('Termenul limită de înscriere nu poate fi după data de început.');
  }
  return erori;
}
