import { supabase } from '../supabaseClient';
import type { OperatieCategorii, CategorieNouaInput, MutareCategorie, RezultatOperatieCategorii } from '../types';

const FARA_CLIENT = 'Supabase neinițializat';

/**
 * Faza 41: aplică atomic anulare / fuziune / împărțire / mutare pe categoriile unei competiții.
 * Garda reală este server-side (is_super_admin() în RPC); verificările din FE sunt doar UX.
 */
export async function aplicaOperatieCategorii(p: {
    operatie: OperatieCategorii;
    competitieId: string;
    surse?: string[];
    categoriiNoi?: CategorieNouaInput[];
    mutari?: MutareCategorie[];
    asteptat?: number | null;
}): Promise<{ data: RezultatOperatieCategorii | null; error: any }> {
    if (!supabase) return { data: null, error: FARA_CLIENT };
    const { data, error } = await supabase.rpc('categorii_aplica_operatie', {
        p_operatie: p.operatie,
        p_competitie: p.competitieId,
        p_surse: p.surse ?? [],
        p_categorii_noi: p.categoriiNoi ?? [],
        p_mutari: p.mutari ?? [],
        p_asteptat: p.asteptat ?? null,
    });
    return { data: error ? null : (data as RezultatOperatieCategorii), error };
}
