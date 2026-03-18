import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, AnuntPrezenta } from '../types';
import { useError } from '../components/ErrorProvider';

export const useAttendanceData = (clubId?: string | null, skipFetch = false, filters?: { date?: string, from?: string, to?: string }) => {
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [anunturiPrezenta, setAnunturiPrezenta] = useState<AnuntPrezenta[]>([]);
    const [todaysTrainings, setTodaysTrainings] = useState<Antrenament[]>([]);
    const [loading, setLoading] = useState(!skipFetch);
    const [error, setError] = useState<string | null>(null);
    const { showError, showSuccess } = useError();

    const getTodayString = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const fetchAttendanceData = useCallback(async () => {
        if (!supabase || skipFetch) return;
        setLoading(true);
        setError(null);
        try {
            // Join with prezenta_antrenament
            let antrenamenteQuery = supabase.from('program_antrenamente').select('*, prezenta:prezenta_antrenament(sportiv_id, status)');
            let anunturiQuery = supabase.from('vedere_cluburi_anunturi_prezenta').select('*');

            // Apply date filters if provided
            if (filters?.date) {
                antrenamenteQuery = antrenamenteQuery.eq('data', filters.date);
            } else {
                if (filters?.from) antrenamenteQuery = antrenamenteQuery.gte('data', filters.from);
                if (filters?.to) antrenamenteQuery = antrenamenteQuery.lte('data', filters.to);
            }

            const [antrenamenteRes, anunturiRes] = await Promise.all([
                antrenamenteQuery,
                anunturiQuery
            ]);

            if (antrenamenteRes.error) throw antrenamenteRes.error;
            if (anunturiRes.error) throw anunturiRes.error;

            const allTrainings = antrenamenteRes.data || [];
            setAntrenamente(allTrainings);
            setAnunturiPrezenta(anunturiRes.data || []);

            // Filter today's trainings (if not already filtered by query)
            const today = getTodayString();
            const todayFiltered = allTrainings
                .filter(a => (a.data || '').toString().slice(0, 10) === today)
                .sort((a, b) => a.ora_start.localeCompare(b.ora_start));
            setTodaysTrainings(todayFiltered);

        } catch (err: any) {
            console.error("Error fetching attendance data:", err);
            setError(err.message);
            showError("Eroare încărcare date", err.message || "Nu s-au putut prelua datele de prezență.");
        } finally {
            setLoading(false);
        }
    }, [clubId, showError, skipFetch, JSON.stringify(filters)]);

    const saveAttendance = useCallback(async (antrenamentId: string, records: { sportiv_id: string; status: 'prezent' | 'absent' }[]) => {
        if (!antrenamentId) {
            showError("Eroare", "ID antrenament lipsă.");
            return false;
        }

        try {
            const recordsToUpsert = records.map(r => ({
                antrenament_id: antrenamentId,
                sportiv_id: r.sportiv_id,
                status: r.status
            }));

            const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
            
            if (error) throw error;

            showSuccess("Succes", "Prezența a fost salvată cu succes.");
            // Refresh data to reflect changes
            await fetchAttendanceData();
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
        }
    }, [fetchAttendanceData, showError, showSuccess]);

    useEffect(() => {
        fetchAttendanceData();
    }, [fetchAttendanceData]);

    return {
        antrenamente,
        setAntrenamente,
        todaysTrainings,
        allTrainings: antrenamente,
        anunturiPrezenta,
        setAnunturiPrezenta,
        loading,
        error,
        refetch: fetchAttendanceData,
        saveAttendance
    };
};
