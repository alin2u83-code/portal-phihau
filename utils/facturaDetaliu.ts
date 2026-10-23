/**
 * Logica pură a ecranului de detaliu factură (Faza 31, planul 03).
 *
 * Sumar sume, istoric tranzacții pe factură, plan de achitare rapidă și
 * construcția payload-ului whitelist pentru corecția manuală — toate funcții
 * pure, fără React/Supabase, testate izolat cu utils/facturaDetaliu.test.ts.
 *
 * Semantica sumelor în DB (verificată live 23.10.2026, aliniată cu services/soldService.ts):
 * `suma` = total facturat DUPĂ reducere (nu scade la încasare — soldService scade `suma` din sold);
 * `suma_initiala` = preț de listă înainte de reducere (poate fi null);
 * `suma_ramasa` = rest de plată, recalculat de `recalculare_stare_plata` ca `suma - SUM(tranzactie_plata)`.
 */
import type { Plata, Tranzactie } from '../types';
import { restDePlata } from './paymentStatus';

// ─── Constante ───────────────────────────────────────────────────────────────

/** Toleranță pentru comparații de sume (evită erori de rotunjire float). */
const TOLERANTA = 0.01;

/** Lista albă de câmpuri editabile pe tabela `plati` din ecranul de detaliu (D-07). */
/** Subset din Plata folosit de calculele de sume (`suma_ramasa` nu e în types.ts). */
type PlataSume = Pick<Plata, 'suma' | 'suma_initiala' | 'status'> & { suma_ramasa?: number | null };

export const CAMPURI_EDITABILE_PLATA = ['descriere', 'data', 'suma_initiala', 'suma', 'status'] as const;

// ─── Tipuri ──────────────────────────────────────────────────────────────────

export interface SumarFactura {
  sumaFacturata: number;
  restDePlata: number;
  totalIncasat: number;
  avertizare: string | null;
}

export interface RandIstoricTranzactie {
  tranzactieId: string;
  data: string | null;
  suma: number;
  metoda: string | null;
  nrFacturiAcoperite: number;
  sursa: 'tranzactii' | 'alocare' | 'ambele';
}

export type PlanAchitare =
  | { tip: 'invalid'; motiv: string }
  | { tip: 'direct'; sumaIncasata: number }
  | { tip: 'cu_corectie'; sumaIncasata: number; sumaVeche: number; sumaNoua: number };

export interface FormEditareFactura {
  descriere: string;
  data: string;
  suma_initiala: number | string; // preț listă
  suma: number | string;         // total facturat după reducere
  status: string;
}

// ─── Helpere interne ─────────────────────────────────────────────────────────

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function parseSuma(v: number | string): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(',', '.'));
}

// ─── Funcții exportate ───────────────────────────────────────────────────────

/**
 * Calculează sumele separate ale unei facturi: sumă facturată, rest de plată,
 * total încasat — plus o avertizare când statusul e 'Achitat' dar nu există
 * nicio tranzacție care să justifice restul de plată zero (marcaj fără încasare).
 */
export function calculeazaSumarFactura(
  plata: PlataSume,
  nrTranzactii: number
): SumarFactura {
  const sumaFacturata = round2(plata.suma);
  const rest = round2(restDePlata(plata));
  const totalIncasat = round2(Math.max(0, sumaFacturata - rest));

  let avertizare: string | null = null;
  if (plata.status === 'Achitat' && sumaFacturata > TOLERANTA && nrTranzactii === 0) {
    avertizare = `Status «Achitat», dar nu există nicio încasare înregistrată pentru suma facturată de ${sumaFacturata.toFixed(2)} RON — marcaj fără încasare.`;
  }

  return { sumaFacturata, restDePlata: rest, totalIncasat, avertizare };
}

/** Rând din `tranzactie_plata`: cât din tranzacție a fost alocat acestei facturi. */
export interface AlocareTranzactie {
  tranzactie_id: string;
  suma_alocata: number;
}

/**
 * Construiește istoricul de tranzacții asociate unei facturi din ambele surse
 * de legătură (`tranzactii.plata_ids` — fluxul vechi — și `tranzactie_plata` — fluxul normalizat),
 * deduplicat pe id-ul tranzacției, sortat descrescător după dată.
 */
export function construiesteIstoricTranzactii(
  plataId: string,
  tranzactii: Tranzactie[],
  alocari: AlocareTranzactie[]
): RandIstoricTranzactie[] {
  const randuri = new Map<string, RandIstoricTranzactie>();

  for (const t of tranzactii) {
    if (Array.isArray(t.plata_ids) && t.plata_ids.includes(plataId)) {
      randuri.set(t.id, {
        tranzactieId: t.id,
        data: t.data_platii ?? null,
        suma: Number(t.suma) || 0,
        metoda: t.metoda_plata ?? null,
        nrFacturiAcoperite: t.plata_ids.length,
        sursa: 'tranzactii',
      });
    }
  }

  for (const al of alocari) {
    const tranzactia = tranzactii.find(t => t.id === al.tranzactie_id);
    const existent = randuri.get(al.tranzactie_id);
    if (existent) {
      existent.sursa = 'ambele';
      existent.suma = Number(al.suma_alocata);
    } else {
      randuri.set(al.tranzactie_id, {
        tranzactieId: al.tranzactie_id,
        data: tranzactia?.data_platii ?? null,
        suma: Number(al.suma_alocata) || 0,
        metoda: tranzactia?.metoda_plata ?? null,
        nrFacturiAcoperite: tranzactia?.plata_ids?.length || 1,
        sursa: 'alocare',
      });
    }
  }

  return Array.from(randuri.values()).sort((a, b) => {
    if (a.data == null && b.data == null) return 0;
    if (a.data == null) return 1;
    if (b.data == null) return -1;
    return b.data.toString().slice(0, 10).localeCompare(a.data.toString().slice(0, 10));
  });
}

/**
 * Calculează planul acțiunii rapide "Marchează Achitat cu X RON" — decide
 * dacă e nevoie de o corecție a sumei facturate înainte de a apela RPC-ul
 * `proceseaza_plata_factura` (vezi 31-03-PLAN.md obiectiv).
 */
export function planificaAchitareRapida(
  plata: PlataSume,
  sumaIncasata: number
): PlanAchitare {
  if (plata.status === 'Anulat') {
    return { tip: 'invalid', motiv: 'Factura este anulată — reactivați-o înainte de încasare.' };
  }
  if (plata.status === 'Achitat') {
    return { tip: 'invalid', motiv: 'Factura este deja achitată.' };
  }
  if (!Number.isFinite(sumaIncasata) || sumaIncasata <= 0) {
    return { tip: 'invalid', motiv: 'Introduceți o sumă pozitivă.' };
  }

  const rest = round2(restDePlata(plata));
  const X = round2(sumaIncasata);

  if (X > rest + TOLERANTA) {
    return { tip: 'invalid', motiv: `Suma depășește restul de plată (${rest.toFixed(2)} RON). Pentru avans folosiți Jurnal Încasări.` };
  }

  if (round2(Math.abs(X - rest)) <= TOLERANTA) {
    return { tip: 'direct', sumaIncasata: rest };
  }

  // Încasăm mai puțin decât restul și iertăm diferența: totalul facturat scade cu (rest − X),
  // astfel încât după încasare suma încasată = totalul și factura devine Achitat.
  const veche = round2(plata.suma);
  return {
    tip: 'cu_corectie',
    sumaIncasata: X,
    sumaVeche: veche,
    sumaNoua: round2(veche - (rest - X)),
  };
}

/**
 * Construiește payload-ul whitelist pentru corecția manuală (D-07) — obiect
 * literal cu EXACT cele 5 chei editabile, niciodată prin spread din forma sau
 * din rândul de stare (care poate conține câmpuri de JOIN precum `club_nume`).
 */
export function construiestePayloadEditareFactura(
  form: FormEditareFactura
): { payload: Pick<Plata, 'descriere' | 'data' | 'suma_initiala' | 'suma' | 'status'> | null; eroare: string | null } {
  const descriere = (form.descriere ?? '').trim();
  if (!descriere) {
    return { payload: null, eroare: 'Descrierea este obligatorie.' };
  }

  const data = (form.data ?? '').toString();
  if (!/^\d{4}-\d{2}-\d{2}/.test(data)) {
    return { payload: null, eroare: 'Data este invalidă.' };
  }

  const sumaInitiala = parseSuma(form.suma_initiala);
  const suma = parseSuma(form.suma);
  if (!Number.isFinite(sumaInitiala) || sumaInitiala < 0 || !Number.isFinite(suma) || suma < 0) {
    return { payload: null, eroare: 'Sumele trebuie să fie numere pozitive.' };
  }

  const status = form.status;
  if (status !== 'Neachitat' && status !== 'Achitat Parțial' && status !== 'Achitat') {
    return { payload: null, eroare: 'Status invalid (anularea se face din acțiunea dedicată).' };
  }

  return {
    payload: {
      descriere,
      data: data.slice(0, 10),
      suma_initiala: round2(sumaInitiala),
      suma: round2(suma),
      status,
    },
    eroare: null,
  };
}
