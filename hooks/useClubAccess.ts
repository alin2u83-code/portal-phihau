import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../utils/cache';

export const useFetchAllowedClubs = (userId?: string) => {
    const [allowedClubs, setAllowedClubs] = useState<string[]>([]);
    const [loading, setLoading] = useState(!!userId);

    useEffect(() => {
        // Fara sesiune nu cerem nimic (pagina de login nu trebuie sa apeleze RPC-ul).
        if (!userId) {
            setAllowedClubs([]);
            setLoading(false);
            return;
        }
        const fetchClubs = async () => {
            setLoading(true);
            // Cheie per utilizator: cheia comuna scurgea lista unui user catre urmatorul login pe acelasi dispozitiv.
            const cacheKey = `cache_allowed_clubs_${userId}`;
            const cached = getCachedData<string[]>(cacheKey, 15); // Cache for 15 minutes

            if (cached) {
                setAllowedClubs(cached);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.rpc('get_my_active_clubs');
            if (data) {
                const clubIds = data.map((c: any) => c.club_id);
                setAllowedClubs(clubIds);
                setCachedData(cacheKey, clubIds);
            }
            setLoading(false);
        };
        fetchClubs();
    }, [userId]);

    return { allowedClubs, loading };
};
