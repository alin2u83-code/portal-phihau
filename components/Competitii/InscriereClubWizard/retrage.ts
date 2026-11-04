import { supabase } from '../../../supabaseClient';
import type { InscriereCompetitie } from '../../../types';

export interface RezultatRetragere { ok: boolean; mesaj?: string; /** true cand o parte din randuri s-a sters deja (UI trebuie reincarcat) */ partial?: boolean }

/** Sterge definitiv inscrierile date; refuza daca vreuna are taxa achitata si verifica numarul de randuri sterse efectiv (RLS poate bloca fara eroare). */
export async function retrageInscrieri(rows: Pick<InscriereCompetitie, 'id' | 'taxa_achitata'>[]): Promise<RezultatRetragere> {
  if (rows.length === 0) return { ok: true };
  if (rows.some(i => i.taxa_achitata)) {
    return { ok: false, mesaj: 'Taxa este deja achitată pentru această înscriere. Anulează mai întâi plata din Financiar.' };
  }
  const ids = rows.map(i => i.id);
  const { data, error } = await supabase.from('inscrieri_competitie').delete().in('id', ids).select('id');
  if (error) return { ok: false, mesaj: error.message };
  if ((data?.length ?? 0) !== ids.length) {
    return { ok: false, partial: true, mesaj: `Au fost șterse ${data?.length ?? 0} din ${ids.length} înscrieri (posibil lipsă permisiuni). Reîncarcă pagina.` };
  }
  return { ok: true };
}
