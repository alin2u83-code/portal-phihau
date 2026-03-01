import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, AnuntPrezenta } from '../types';

export const useAttendanceData = (clubId?: string | null) => {
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [anunturiPrezenta, setAnunturiPrezenta] = useState<AnuntPrezenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAttendanceData = useCallback(async () => {
        if (!supabase) return;
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
        } finally {
            setLoading(false);
        }
    }, [clubId]);

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
        refetch: fetchAttendanceData
    };
};
