import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';
import { DEBUTANT_GRAD_ID } from '../constants';

export const adaugaSportiv = async (formData: Partial<Sportiv>): Promise<{ success: boolean; data?: Sportiv; error?: any }> => {
    try {
        const { roluri, cluburi, ...sportivData } = formData;
        
        // Asigură-te că sportivul are un grad (implicit Debutant dacă lipsește)
        if (!sportivData.grad_actual_id) {
            sportivData.grad_actual_id = DEBUTANT_GRAD_ID;
        }

        const { data: inserted, error: insertError } = await supabase.from('sportivi').insert(sportivData).select('id').single();
        if (insertError) throw insertError;

        // Inserăm în istoric_grade pentru a stabili gradul inițial
        if (sportivData.grad_actual_id) {
            await supabase.from('istoric_grade').insert({
                sportiv_id: inserted.id,
                grad_id: sportivData.grad_actual_id,
                data_obtinere: new Date().toISOString().split('T')[0],
                observatii: 'Înregistrare inițială'
            });
        }
        
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
            const { grad_actual_id, grupe, familie, sportivi_count, username, parola, ...restData } = otherData as any;

            // Strip any remaining object/array values (join fields) that can't be written to DB
            const safeData = Object.fromEntries(
                Object.entries(restData).filter(([, v]) => v === null || typeof v !== 'object')
            );

            if (Object.keys(safeData).length > 0) {
                const { error: updateError } = await supabase.from('sportivi').update(safeData).eq('id', id);
                if (updateError) throw updateError;
            }

            // Dacă gradul s-a schimbat manual din interfață, îl adăugăm în istoric
            if (grad_actual_id) {
                const { error: historyError } = await supabase.from('istoric_grade').upsert({
                    sportiv_id: id,
                    grad_id: grad_actual_id,
                    data_obtinere: new Date().toISOString().split('T')[0],
                    observatii: 'Actualizare manuală din profil'
                }, { onConflict: 'sportiv_id,grad_id' });
                if (historyError) throw historyError;
            }
        }

        // Always fetch from the view to get the latest calculated/joined fields
        const { data, error } = await supabase.from('vedere_cluburi_sportivi').select('*, cluburi(id, nume)').eq('id', id).single();
        if (error) throw error;

        return { success: true, data: data as Sportiv };
    } catch (error) {
        return { success: false, error };
    }
};
