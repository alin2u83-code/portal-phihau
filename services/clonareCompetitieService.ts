import { supabase } from '../supabaseClient';
import type { RezultatClonareCompetitie, TipCompetitie } from '../types';

const FARA_CLIENT = 'Supabase neinițializat';

/**
 * Faza 45: clonează atomic o competiție (setări, probe, categorii listate) într-una nouă în draft.
 * Garda reală este server-side (is_super_admin() în RPC); verificările din FE sunt doar UX.
 * Mesajele serverului sunt deja în română.
 */
export async function cloneazaCompetitie(p: {
    sursaId: string;
    denumire: string;
    tip: TipCompetitie;
    dataInceput: string;
    dataSfarsit: string;
    deadline: string;
    setari: boolean;
    probe: boolean;
    categorii: string[];
}): Promise<{ data: RezultatClonareCompetitie | null; error: any }> {
    if (!supabase) return { data: null, error: FARA_CLIENT };
    const { data, error } = await supabase.rpc('competitie_cloneaza', {
        p_sursa: p.sursaId,
        p_denumire: p.denumire,
        p_tip: p.tip,
        p_data_inceput: p.dataInceput,
        p_data_sfarsit: p.dataSfarsit,
        p_deadline: p.deadline,
        p_setari: p.setari,
        p_probe: p.probe,
        p_categorii: p.categorii,
    });
    return { data: error ? null : (data as RezultatClonareCompetitie), error };
}
