import { supabase } from '../supabaseClient';
import type { ProgramItem } from '../types';

type SlotOrar = Pick<ProgramItem, 'ziua' | 'ora_start' | 'ora_sfarsit'> & { id?: string; is_activ?: boolean };

const esteNou = (id?: string) => !id || String(id).startsWith('new-');

/**
 * Sincronizează orar_saptamanal al grupei cu lista dată, pe diferențe:
 * inserează intervalele noi, actualizează cele păstrate, șterge doar ce a dispărut.
 * Ordinea (insert → update → delete) face ca o eroare la mijloc să lase rânduri în plus,
 * nu să lase grupa fără orar. Evită delete-all deoarece sportivi_program_personalizat.orar_id
 * are ON DELETE CASCADE. Aruncă eroare la orice pas eșuat.
 */
export async function sincronizeazaOrar(grupaId: string, clubId: string, slots: SlotOrar[]): Promise<void> {
    const { data: curente, error: readErr } = await supabase.from('orar_saptamanal').select('id').eq('grupa_id', grupaId);
    if (readErr) throw readErr;

    const pastrate = slots.filter(s => !esteNou(s.id));
    const noi = slots.filter(s => esteNou(s.id));
    const pastrateIds = new Set(pastrate.map(s => s.id));
    const deSters = (curente || []).map(c => c.id).filter(id => !pastrateIds.has(id));

    if (noi.length > 0) {
        const { error } = await supabase.from('orar_saptamanal').insert(
            noi.map(s => ({ ziua: s.ziua, ora_start: s.ora_start, ora_sfarsit: s.ora_sfarsit, is_activ: s.is_activ ?? true, grupa_id: grupaId, club_id: clubId }))
        );
        if (error) throw error;
    }

    for (const s of pastrate) {
        const { error } = await supabase.from('orar_saptamanal')
            .update({ ziua: s.ziua, ora_start: s.ora_start, ora_sfarsit: s.ora_sfarsit, is_activ: s.is_activ ?? true })
            .eq('id', s.id!);
        if (error) throw error;
    }

    if (deSters.length > 0) {
        // .select() — RLS filtrează tăcut rândurile nepermise; verificăm că s-au șters toate
        const { data: sterse, error } = await supabase.from('orar_saptamanal').delete().in('id', deSters).select('id');
        if (error) throw error;
        if ((sterse || []).length !== deSters.length) {
            throw new Error('Unele intervale vechi nu au putut fi șterse (permisiuni). Reîncarcă și verifică orarul.');
        }
    }
}
