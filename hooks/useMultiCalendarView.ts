import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Antrenament } from '../types';

// Caller MUST memoize grupeIds (e.g. useMemo(() => grupe.map(g => g.id), [grupe]))
// to avoid infinite re-fetch: array identity changes on every render if not memoized.
export const useMultiCalendarView = (grupeIds: string[], initialDate?: string) => {
    const todayLocal = new Date().toLocaleDateString('sv-SE');
    const [date, setDate] = useState(initialDate || todayLocal);
    const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || todayLocal);
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();

    const fetchAntrenamente = useCallback(async () => {
        setLoading(true);
        try {
            if (grupeIds.length === 0) {
                setAntrenamente([]);
                return;
            }

            const startOfMonth = date.substring(0, 7) + '-01';
            const d = new Date(date);
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('sv-SE');

            const { data, error } = await supabase.from('program_antrenamente')
                .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status_id)')
                .in('grupa_id', grupeIds)
                .gte('data', startOfMonth)
                .lte('data', endOfMonth)
                .order('data')
                .order('ora_start');

            if (error) {
                showError('Eroare la încărcarea calendarului', error.message);
            } else {
                setAntrenamente((data || []).map(a => ({ ...a, prezenta: a.prezenta || [] })));
            }
        } finally {
            setLoading(false);
        }
    }, [grupeIds, date, showError]);

    useEffect(() => {
        fetchAntrenamente();
    }, [fetchAntrenamente]);

    return {
        date,
        setDate,
        selectedDate,
        setSelectedDate,
        todayLocal,
        antrenamente,
        loading,
        fetchAntrenamente,
    };
};
