import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, AnuntPrezenta } from '../types';
import { useError } from '../components/ErrorProvider';

// Helper: fetch statuse_prezenta and return a lookup map
const fetchStatusById = async (): Promise<Record<string, { este_prezent: boolean; denumire: string }>> => {
    const { data } = await supabase.from('statuse_prezenta').select('id, este_prezent, denumire');
    return Object.fromEntries((data || []).map(s => [s.id, { este_prezent: s.este_prezent, denumire: s.denumire }]));
};

// Enrich prezenta records with status object computed from status_id
const enrichPrezenta = (
    prez: any[],
    statusById: Record<string, { este_prezent: boolean; denumire: string }>
) => prez.map(p => ({
    ...p,
    status: p.status_id ? (statusById[p.status_id] ?? null) : null,
}));

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
        // Nu face fetch dacă nu există sesiune activă (evită 401 la pagina de login)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            // Citim din VIEW-ul vedere_cluburi_program_antrenamente care:
            // 1. Include deja `nume_grupa` și `sala` prin JOIN cu grupe
            // 2. Filtrează automat după clubul activ prin get_active_club_id() (RLS VIEW)
            // 3. Calculează durata_minute și ziua_saptamanii
            let antrenamenteQuery = supabase
                .from('vedere_cluburi_program_antrenamente')
                .select('*, prezenta:prezenta_antrenament(sportiv_id, status_id)');
            const anunturiQuery = supabase.from('anunturi_prezenta').select('*');

            if (filters?.date) {
                antrenamenteQuery = antrenamenteQuery.eq('data', filters.date);
            } else {
                if (filters?.from) antrenamenteQuery = antrenamenteQuery.gte('data', filters.from);
                if (filters?.to) antrenamenteQuery = antrenamenteQuery.lte('data', filters.to);
            }

            const [antrenamenteRes, anunturiRes, statusById] = await Promise.all([
                antrenamenteQuery,
                anunturiQuery,
                fetchStatusById(),
            ]);

            if (antrenamenteRes.error) throw antrenamenteRes.error;
            if (anunturiRes.error) throw anunturiRes.error;

            const allTrainings = (antrenamenteRes.data || []).map(t => ({
                ...t,
                // VIEW-ul furnizează direct nume_grupa și sala prin JOIN cu grupe
                // Nu mai e nevoie de fallback pe join-uri nested care pot returna null
                prezenta: enrichPrezenta(t.prezenta || [], statusById),
            }));

            setAntrenamente(allTrainings);
            setAnunturiPrezenta(anunturiRes.data || []);

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

    const saveAttendance = useCallback(async (antrenamentId: string, records: { sportiv_id: string; status_id: string }[]) => {
        if (!antrenamentId) {
            showError("Eroare", "ID antrenament lipsă.");
            return false;
        }
        try {
            const recordsToUpsert = records.map(r => ({
                antrenament_id: antrenamentId,
                sportiv_id: r.sportiv_id,
                status_id: r.status_id,
            }));
            const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
            if (error) throw error;
            showSuccess("Succes", "Prezența a fost salvată cu succes.");
            await fetchAttendanceData();
            return true;
        } catch (err: any) {
            let userMessage = "A apărut o eroare la salvarea datelor în baza de date.";
            if (err.code === '42501') userMessage = "Nu aveți permisiunea de a modifica prezența pentru acest antrenament.";
            else if (err.code === '23505') userMessage = "Există deja o înregistrare de prezență pentru acest sportiv.";
            else if (err.message) userMessage = err.message;
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
        saveAttendance,
    };
};
