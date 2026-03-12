import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export const adaugaSportiv = async (formData: Partial<Sportiv>): Promise<{ success: boolean; data?: Sportiv; error?: any }> => {
    try {
        const { roluri, cluburi, ...sportivData } = formData;
        const { data: inserted, error: insertError } = await supabase.from('sportivi').insert(sportivData).select('id').single();
        if (insertError) throw insertError;
        
        const { data, error } = await supabase.from('vedere_cluburi_sportivi').select('*, cluburi(id, nume)').eq('id', inserted.id).single();
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
        if (nume !== undefined && nume !== currentSportiv.nume) nameChanged = true;
        if (prenume !== undefined && prenume !== currentSportiv.prenume) nameChanged = true;

        if (nameChanged) {
             const newNume = nume !== undefined ? nume : currentSportiv.nume;
             const newPrenume = prenume !== undefined ? prenume : currentSportiv.prenume;

             const { error: rpcError } = await supabase.rpc('actualizeaza_nume_sportiv', {
                 p_sportiv_id: id,
                 p_nume_nou: newNume,
                 p_prenume_nou: newPrenume
             });
             
             if (rpcError) throw rpcError;
        }

        // Update other fields if any
        if (Object.keys(otherData).length > 0) {
            const { error: updateError } = await supabase.from('sportivi').update(otherData).eq('id', id);
            if (updateError) throw updateError;
        }

        // Always fetch from the view to get the latest calculated/joined fields
        const { data, error } = await supabase.from('vedere_cluburi_sportivi').select('*, cluburi(id, nume)').eq('id', id).single();
        if (error) throw error;

        return { success: true, data: data as Sportiv };
    } catch (error) {
        return { success: false, error };
    }
};
