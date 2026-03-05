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
        const { roluri, cluburi, nume, prenume, ...otherData } = formData;

        // Fetch current data to check for changes and get missing name parts
        const { data: currentSportiv, error: fetchError } = await supabase.from('sportivi').select('nume, prenume').eq('id', id).single();
        if (fetchError) throw fetchError;

        let nameChanged = false;
        // Check if name/prenume changed (case insensitive comparison might be better but strict is safer for now)
        if (nume !== undefined && nume !== currentSportiv.nume) nameChanged = true;
        if (prenume !== undefined && prenume !== currentSportiv.prenume) nameChanged = true;

        if (nameChanged) {
             const newNume = nume !== undefined ? nume : currentSportiv.nume;
             const newPrenume = prenume !== undefined ? prenume : currentSportiv.prenume;

             const { data: rpcData, error: rpcError } = await supabase.rpc('actualizeaza_nume_sportiv', {
                 p_sportiv_id: id,
                 p_nume_nou: newNume,
                 p_prenume_nou: newPrenume
             });
             
             if (rpcError) throw rpcError;
        }

        let updatedSportiv: Sportiv;

        // Update other fields if any
        if (Object.keys(otherData).length > 0) {
            const { data, error } = await supabase.from('sportivi').update(otherData).eq('id', id).select('*, cluburi(*)').single();
            if (error) throw error;
            updatedSportiv = data as Sportiv;
        } else {
            // Fetch updated record
            const { data, error } = await supabase.from('sportivi').select('*, cluburi(*)').eq('id', id).single();
            if (error) throw error;
            updatedSportiv = data as Sportiv;
        }

        return { success: true, data: updatedSportiv };
    } catch (error) {
        return { success: false, error };
    }
};
