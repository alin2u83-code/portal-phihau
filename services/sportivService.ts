import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export const adaugaSportiv = async (formData: Partial<Sportiv>): Promise<{ success: boolean; data?: Sportiv; error?: any }> => {
    try {
        const { roluri, cluburi, ...sportivData } = formData;
        const { data, error } = await supabase.from('sportivi').insert(sportivData).select('*, cluburi(*)').single();
        if (error) throw error;
        return { success: true, data: data as Sportiv };
    } catch (error) {
        return { success: false, error };
    }
};

export const actualizeazaSportiv = async (id: string, formData: Partial<Sportiv>): Promise<{ success: boolean; data?: Sportiv; error?: any }> => {
    try {
        const { roluri, cluburi, ...sportivData } = formData;
        const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', id).select('*, cluburi(*)').single();
        if (error) throw error;
        return { success: true, data: data as Sportiv };
    } catch (error) {
        return { success: false, error };
    }
};
