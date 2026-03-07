import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useFetchAllowedClubs = () => {
    const [allowedClubs, setAllowedClubs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClubs = async () => {
            const { data, error } = await supabase.rpc('get_my_active_clubs');
            if (data) {
                setAllowedClubs(data.map((c: any) => c.club_id));
            }
            setLoading(false);
        };
        fetchClubs();
    }, []);

    return { allowedClubs, loading };
};
