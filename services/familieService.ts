import { supabase } from '../supabaseClient';
import { Familie, Sportiv } from '../types';

export const fetchFamilii = async (): Promise<{ data: Familie[]; error: any }> => {
    const { data, error } = await supabase.from('familii').select('*');
    return { data: data || [], error };
};

export const createFamilie = async (nume: string): Promise<{ data: Familie | null; error: any }> => {
    const { data, error } = await supabase.from('familii').insert({ nume }).select().single();
    return { data, error };
};

export const updateFamilie = async (id: string, updates: Partial<Familie>): Promise<{ error: any }> => {
    const { error } = await supabase.from('familii').update(updates).eq('id', id);
    return { error };
};

export const deleteFamilie = async (id: string): Promise<{ error: any }> => {
    const { error } = await supabase.from('familii').delete().eq('id', id);
    return { error };
};

export const assignSportiviToFamilie = async (familieId: string, sportivIds: string[]): Promise<{ data: Sportiv[]; error: any }> => {
    const { data, error } = await supabase.from('sportivi').update({ familie_id: familieId }).in('id', sportivIds).select();
    return { data: data || [], error };
};

export const removeSportivFromFamilie = async (sportivId: string): Promise<{ error: any }> => {
    const { error } = await supabase.from('sportivi').update({ familie_id: null }).eq('id', sportivId);
    return { error };
};
