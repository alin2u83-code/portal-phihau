import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';

export const useAttendance = () => {
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const saveAttendance = useCallback(async (antrenamentId: string, records: { sportiv_id: string; status: 'prezent' | 'absent' }[]) => {
        if (!antrenamentId) {
            showError("Eroare", "ID antrenament lipsă.");
            return false;
        }
        setLoading(true);
        try {
            const recordsToUpsert = records.map(r => ({
                antrenament_id: antrenamentId,
                sportiv_id: r.sportiv_id,
                status: r.status
            }));

            const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
            
            if (error) throw error;

            showSuccess("Succes", "Prezența a fost salvată cu succes.");
            return true;
        } catch (err: any) {
            console.error("Error saving attendance:", err);
            let userMessage = "A apărut o eroare la salvarea datelor în baza de date.";
            
            if (err.code === '42501') {
                userMessage = "Nu aveți permisiunea de a modifica prezența pentru acest antrenament.";
            } else if (err.code === '23505') {
                userMessage = "Există deja o înregistrare de prezență pentru acest sportiv.";
            } else if (err.message) {
                userMessage = err.message;
            }

            showError("Eroare salvare prezență", userMessage);
            return false;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    return { saveAttendance, loading };
};
