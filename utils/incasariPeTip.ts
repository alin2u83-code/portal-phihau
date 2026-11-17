import type { Plata, Tranzactie } from '../types';

/**
 * Incasari pe tip de factura, calculate din alocari (D-02, Faza 44: tranzactie_plata e sursa unica).
 * Inlocuieste logica veche, care atribuia toata suma tranzactiei tipului primei facturi (plata_ids[0]).
 * Fiecare alocare adauga suma_alocata tipului facturii ei; restul nealocat (si alocarile spre facturi
 * necunoscute) merg la `etichetaAvans`.
 */
export function incasariPeTip(
  tranzactii: Pick<Tranzactie, 'suma' | 'alocari'>[],
  plati: Pick<Plata, 'id' | 'tip'>[],
  etichetaAvans = 'Avans / Neclasificat'
): Record<string, number> {
  const tipPeId = new Map(plati.map((p) => [p.id, p.tip as string]));
  const rez: Record<string, number> = {};
  const add = (k: string, v: number) => { rez[k] = (rez[k] || 0) + v; };
  for (const t of tranzactii) {
    let alocat = 0;
    for (const a of t.alocari ?? []) {
      add(tipPeId.get(a.plata_id) ?? etichetaAvans, a.suma_alocata);
      alocat += a.suma_alocata;
    }
    const rest = Number(t.suma) - alocat;
    if (rest > 0.005) add(etichetaAvans, rest);
  }
  for (const k of Object.keys(rez)) rez[k] = Math.round(rez[k] * 100) / 100;
  return rez;
}
