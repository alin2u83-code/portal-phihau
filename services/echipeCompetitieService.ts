// Faza 42 D-08: membrii echipei se sincronizeaza fara stergere prealabila.
// RLS si triggerele FRAM / inchidere inscrieri sunt garda reala; aici doar ordinea scrierilor si mesajele.
import { supabase } from '../supabaseClient';
import { diferentaMembri } from '../utils/editareCompetitie';
import type { MembruEchipa } from '../utils/editareCompetitie';

const MSG_INCHIS = 'Înscrierile s-au închis; doar federația poate modifica.';

export interface RezultatSincronizare { ok: boolean; mesaj?: string; partial?: boolean }

/**
 * Ordinea: adauga -> schimba rol -> scoate. Un esec la mijloc nu lasa niciodata echipa fara membri,
 * iar membrii neschimbati nu se reinsereaza (un membru intrat ca exceptie FRAM nu mai blocheaza editarea).
 * Nu arunca: intoarce { ok, mesaj, partial }.
 */
export async function sincronizeazaMembriEchipa(
  echipaId: string,
  vechi: MembruEchipa[],
  noi: MembruEchipa[],
): Promise<RezultatSincronizare> {
  try {
    const d = diferentaMembri(vechi, noi);

    if (d.adauga.length > 0) {
      const { data, error } = await supabase
        .from('echipa_sportivi')
        .insert(d.adauga.map(m => ({ echipa_id: echipaId, sportiv_id: m.sportiv_id, rol: m.rol })))
        .select('id');
      if (error) return { ok: false, mesaj: error.message }; // inca nimic schimbat
      if ((data?.length ?? 0) < d.adauga.length) return { ok: false, partial: true, mesaj: MSG_INCHIS };
    }

    for (const m of d.schimbaRol) {
      const { data, error } = await supabase
        .from('echipa_sportivi')
        .update({ rol: m.rol })
        .eq('echipa_id', echipaId)
        .eq('sportiv_id', m.sportiv_id)
        .select('id');
      if (error) return { ok: false, partial: true, mesaj: error.message };
      if (!data?.length) return { ok: false, partial: true, mesaj: MSG_INCHIS };
    }

    if (d.scoate.length > 0) {
      const { data, error } = await supabase
        .from('echipa_sportivi')
        .delete()
        .eq('echipa_id', echipaId)
        .in('sportiv_id', d.scoate)
        .select('id');
      if (error) return { ok: false, partial: true, mesaj: error.message };
      if ((data?.length ?? 0) < d.scoate.length) return { ok: false, partial: true, mesaj: MSG_INCHIS };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, mesaj: e instanceof Error ? e.message : String(e) };
  }
}
