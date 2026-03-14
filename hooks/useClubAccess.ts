import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getCachedData, setCachedData } from '../utils/cache';

export const useFetchAllowedClubs = () => {
    const [allowedClubs, setAllowedClubs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClubs = async () => {
            const cacheKey = 'cache_allowed_clubs';
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
    }, []);

    return { allowedClubs, loading };
};
