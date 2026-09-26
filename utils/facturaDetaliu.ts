/**
 * Logica pură a ecranului de detaliu factură (Faza 31, planul 03).
 *
 * Sumar sume, istoric tranzacții pe factură, plan de achitare rapidă și
 * construcția payload-ului whitelist pentru corecția manuală — toate funcții
 * pure, fără React/Supabase, testate izolat cu utils/facturaDetaliu.test.ts.
 *
 * Semantica sumelor în DB (sql/refactor/REFACTOR_FINANCIAL.sql:1-47):
 * `suma_initiala` = total facturat (după reducere); `suma` = rest de plată,
 * recalculat de `recalculare_stare_plata` ca `suma_initiala - SUM(tranzactii)`.
 */
import type { Plata, Tranzactie, VizualizarePlata } from '../types';

// ─── Constante ───────────────────────────────────────────────────────────────

/** Toleranță pentru comparații de sume (evită erori de rotunjire float). */
const TOLERANTA = 0.01;

/** Lista albă de câmpuri editabile pe tabela `plati` din ecranul de detaliu (D-07). */
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
  sursa: 'tranzactii' | 'vizualizare' | 'ambele';
}

export type PlanAchitare =
  | { tip: 'invalid'; motiv: string }
  | { tip: 'direct'; sumaIncasata: number }
  | { tip: 'cu_corectie'; sumaIncasata: number; sumaInitialaVeche: number; sumaInitialaNoua: number };

export interface FormEditareFactura {
  descriere: string;
  data: string;
  suma_initiala: number | string;
  suma: number | string;
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
  plata: Pick<Plata, 'suma' | 'suma_initiala' | 'status'>,
  nrTranzactii: number
): SumarFactura {
  const sumaFacturata = round2(plata.suma_initiala ?? plata.suma);
  const restDePlata = round2(plata.suma);
  const totalIncasat = round2(Math.max(0, sumaFacturata - restDePlata));

  let avertizare: string | null = null;
  if (plata.status === 'Achitat' && restDePlata > TOLERANTA && nrTranzactii === 0) {
    avertizare = `Status «Achitat», dar restul de plată în baza de date este ${restDePlata.toFixed(2)} RON și nu există nicio încasare înregistrată — marcaj fără încasare.`;
  }

  return { sumaFacturata, restDePlata, totalIncasat, avertizare };
}

/**
 * Construiește istoricul de tranzacții asociate unei facturi din ambele surse
 * de legătură existente (`tranzactii.plata_ids` și `view_plata_sportiv`),
 * deduplicat pe id-ul tranzacției, sortat descrescător după dată.
 */
export function construiesteIstoricTranzactii(
  plataId: string,
  tranzactii: Tranzactie[],
  vizualizari: VizualizarePlata[]
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

  for (const v of vizualizari) {
    if (v.plata_id !== plataId || !v.tranzactie_id) continue;
    const tranzactiaCuAcelasiId = tranzactii.find(t => t.id === v.tranzactie_id);
    const existent = randuri.get(v.tranzactie_id);
    if (existent) {
      existent.sursa = 'ambele';
      if (v.suma_incasata != null) {
        existent.suma = Number(v.suma_incasata);
      }
    } else {
      randuri.set(v.tranzactie_id, {
        tranzactieId: v.tranzactie_id,
        data: tranzactiaCuAcelasiId?.data_platii ?? v.data_plata ?? null,
        suma: Number(v.suma_incasata) || 0,
        metoda: tranzactiaCuAcelasiId?.metoda_plata ?? null,
        nrFacturiAcoperite: tranzactiaCuAcelasiId?.plata_ids?.length || 1,
        sursa: 'vizualizare',
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
  plata: Pick<Plata, 'suma' | 'suma_initiala' | 'status'>,
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

  const rest = round2(plata.suma);
  const X = round2(sumaIncasata);

  if (X > rest + TOLERANTA) {
    return { tip: 'invalid', motiv: `Suma depășește restul de plată (${rest.toFixed(2)} RON). Pentru avans folosiți Jurnal Încasări.` };
  }

  if (round2(Math.abs(X - rest)) <= TOLERANTA) {
    return { tip: 'direct', sumaIncasata: rest };
  }

  const veche = round2(plata.suma_initiala ?? plata.suma);
  return {
    tip: 'cu_corectie',
    sumaIncasata: X,
    sumaInitialaVeche: veche,
    sumaInitialaNoua: round2(veche - (rest - X)),
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

  if (suma > sumaInitiala + TOLERANTA) {
    return { payload: null, eroare: 'Restul de plată nu poate depăși suma facturată.' };
  }

  const status = form.status;
  if (status !== 'Neachitat' && status !== 'Achitat Parțial' && status !== 'Achitat') {
    return { payload: null, eroare: 'Status invalid (anularea se face din acțiunea dedicată).' };
  }

  if (status === 'Achitat' && suma > TOLERANTA) {
    return { payload: null, eroare: 'Pentru status Achitat, restul de plată trebuie să fie 0.' };
  }

  if (status !== 'Achitat' && suma <= TOLERANTA) {
    return { payload: null, eroare: 'Rest 0 înseamnă factură achitată — alegeți statusul Achitat.' };
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
