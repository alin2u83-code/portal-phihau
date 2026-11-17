import { supabase } from '../supabaseClient';
import { Plata, Tranzactie } from '../types';

// D-02 (Faza 44): tranzactie_plata e singura sursa pentru legatura tranzactie <-> factura.
// plata_ids exista doar in memorie, derivat din alocari; nu se citeste din coloana tranzactii.plata_ids
// si nu se trimite inapoi la insert/update (writerii il elimina in planul 44-08).
export const SELECT_TRANZACTIE_CU_ALOCARI = '*, alocari:tranzactie_plata(plata_id, suma_alocata)';

export function normalizeazaTranzactie(row: any): Tranzactie {
    const alocari = (row?.alocari ?? []).map((a: any) => ({ plata_id: a.plata_id, suma_alocata: Number(a.suma_alocata) }));
    // plata_ids dupa spread: suprascrie valoarea coloanei, cat timp coloana mai exista
    return { ...row, alocari, plata_ids: alocari.map((a: any) => a.plata_id) } as Tranzactie;
}

export function normalizeazaTranzactii(rows: any[] | null | undefined): Tranzactie[] {
    return (rows ?? []).map(normalizeazaTranzactie);
}

// Editare încasare existentă. Suma se schimbă doar pe alocarea (tranzactie_plata)
// legată de plataId — trigger-ul DB `on_tranzactie_plata_change` recalculează
// automat plati.suma/status. tranzactii.suma se resincronizează după, ca sumă
// a tuturor alocărilor tranzacției (corect și când o încasare acoperă mai multe facturi).
export async function editeazaIncasare(
  tranzactieId: string,
  plataId: string,
  updates: { suma?: number; data_platii: string; metoda_plata: 'Cash' | 'Transfer Bancar' | 'Revolut' }
): Promise<{ tranzactie: Tranzactie; plata: Plata }> {
  if (updates.suma !== undefined) {
    const { error: allocError } = await supabase
      .from('tranzactie_plata')
      .update({ suma_alocata: updates.suma })
      .eq('tranzactie_id', tranzactieId)
      .eq('plata_id', plataId);
    if (allocError) throw allocError;
  }

  const { data: alocari, error: sumError } = await supabase
    .from('tranzactie_plata')
    .select('suma_alocata')
    .eq('tranzactie_id', tranzactieId);
  if (sumError) throw sumError;
  const sumaTotala = (alocari || []).reduce((s, a) => s + Number(a.suma_alocata), 0);

  const { data: tranzactieActualizata, error: txError } = await supabase
    .from('tranzactii')
    .update({ suma: sumaTotala, data_platii: updates.data_platii, metoda_plata: updates.metoda_plata })
    .eq('id', tranzactieId)
    .select(SELECT_TRANZACTIE_CU_ALOCARI)
    .maybeSingle();
  if (txError) throw txError;
  if (!tranzactieActualizata) throw new Error('Tranzacția nu a putut fi actualizată.');

  const { data: plataActualizata, error: plataFetchError } = await supabase
    .from('plati')
    .select('*')
    .eq('id', plataId)
    .maybeSingle();
  if (plataFetchError) throw plataFetchError;
  if (!plataActualizata) throw new Error('Factura asociată nu a putut fi găsită.');

  return { tranzactie: normalizeazaTranzactie(tranzactieActualizata), plata: plataActualizata as Plata };
}
