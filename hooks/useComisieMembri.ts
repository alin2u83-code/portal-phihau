import { supabase } from '../supabaseClient';
import { ComisieMembru } from '../types';

export type ComisieEntryInput = Pick<ComisieMembru, 'user_id' | 'nume_afisat'>;

export const fetchComisieMembri = async (sesiuneId: string): Promise<ComisieMembru[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('examene_comisie_membri')
        .select('*')
        .eq('sesiune_id', sesiuneId);
    if (error) throw error;
    return (data || []) as ComisieMembru[];
};

// Inlocuieste toti membrii comisiei unei sesiuni cu lista noua (sters + reinserat).
export const syncComisieMembri = async (sesiuneId: string, entries: ComisieEntryInput[]): Promise<void> => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
        .from('examene_comisie_membri')
        .delete()
        .eq('sesiune_id', sesiuneId);
    if (deleteError) throw deleteError;

    if (entries.length === 0) return;

    const rows = entries.map(e => ({
        sesiune_id: sesiuneId,
        user_id: e.user_id,
        nume_afisat: e.nume_afisat
    }));
    const { error: insertError } = await supabase.from('examene_comisie_membri').insert(rows);
    if (insertError) throw insertError;
};

export const checkIsComisieMember = async (sesiuneId: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('is_comisie_member', { p_sesiune_id: sesiuneId });
    if (error) return false;
    return !!data;
};
