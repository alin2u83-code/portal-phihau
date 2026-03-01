import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, AnuntPrezenta } from '../types';
import { useError } from '../components/ErrorProvider';

export const useAttendanceData = (clubId?: string | null, skipFetch = false) => {
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [anunturiPrezenta, setAnunturiPrezenta] = useState<AnuntPrezenta[]>([]);
    const [loading, setLoading] = useState(!skipFetch);
    const [error, setError] = useState<string | null>(null);
    const { showError, showSuccess } = useError();

    const fetchAttendanceData = useCallback(async () => {
        if (!supabase || skipFetch) return;
        setLoading(true);
        setError(null);
        try {
            let antrenamenteQuery = supabase.from('program_antrenamente').select('*, grupe(*), prezenta:prezenta_antrenament!antrenament_id(sportiv_id, status)');
            let anunturiQuery = supabase.from('anunturi_prezenta').select('*');

            if (clubId) {
                antrenamenteQuery = antrenamenteQuery.eq('club_id', clubId);
                anunturiQuery = anunturiQuery.eq('club_id', clubId);
            }

            const [antrenamenteRes, anunturiRes] = await Promise.all([
                antrenamenteQuery,
                anunturiQuery
            ]);

            if (antrenamenteRes.error) throw antrenamenteRes.error;
            if (anunturiRes.error) throw anunturiRes.error;

            setAntrenamente(antrenamenteRes.data || []);
            setAnunturiPrezenta(anunturiRes.data || []);
        } catch (err: any) {
            console.error("Error fetching attendance data:", err);
            setError(err.message);
            showError("Eroare încărcare date", err.message);
        } finally {
            setLoading(false);
        }
    }, [clubId, showError, skipFetch]);

    const saveAttendance = useCallback(async (antrenamentId: string, records: { sportiv_id: string; status: 'prezent' | 'absent' }[]) => {
        try {
            const recordsToUpsert = records.map(r => ({
                antrenament_id: antrenamentId,
                sportiv_id: r.sportiv_id,
                status: r.status
            }));

            const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
            
            if (error) throw error;

            showSuccess("Succes", "Prezența a fost salvată cu succes.");
            // Optionally refetch or update local state
            fetchAttendanceData();
            return true;
        } catch (err: any) {
            console.error("Error saving attendance:", err);
            showError("Eroare salvare prezență", err.message);
            return false;
        }
    }, [fetchAttendanceData, showError, showSuccess]);

    useEffect(() => {
        fetchAttendanceData();
    }, [fetchAttendanceData]);

    return {
        antrenamente,
        setAntrenamente,
        anunturiPrezenta,
        setAnunturiPrezenta,
        loading,
        error,
        refetch: fetchAttendanceData,
        saveAttendance
    };
};
