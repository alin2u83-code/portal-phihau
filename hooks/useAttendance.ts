import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const useAttendance = (antrenamentId: string | null) => {
    const [athletes, setAthletes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAttendance = useCallback(async () => {
        if (!antrenamentId) return;
        setLoading(true);
        try {
            // Fetch athletes for the group associated with this training
            // Assuming a structure where training -> group -> athletes
            const { data, error } = await supabase
                .from('sportivi')
                .select(`
                    id, nume, prenume,
                    prezenta_antrenament(status)
                `)
                .eq('prezenta_antrenament.antrenament_id', antrenamentId);

            if (error) throw error;
            setAthletes(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [antrenamentId]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const toggleAttendance = async (sportivId: string, currentStatus: string | null) => {
        if (!antrenamentId) return;

        try {
            if (currentStatus === 'Prezent') {
                // Delete
                const { error } = await supabase
                    .from('prezenta_antrenament')
                    .delete()
                    .eq('antrenament_id', antrenamentId)
                    .eq('sportiv_id', sportivId);
                if (error) throw error;
            } else {
                // Insert (omitting club_id as requested)
                const { error } = await supabase
                    .from('prezenta_antrenament')
                    .insert({
                        antrenament_id: antrenamentId,
                        sportiv_id: sportivId,
                        status: 'Prezent'
                    });
                if (error) throw error;
            }
            fetchAttendance(); // Refresh
        } catch (err: any) {
            console.error("Error toggling attendance:", err);
        }
    };

    return { athletes, loading, error, toggleAttendance };
};
