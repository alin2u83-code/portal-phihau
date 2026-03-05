import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useExamenRegistration = (sportiv_id: string) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sportiv_id) return;
        
        const fetchData = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_registration_details', { p_sportiv_id: sportiv_id });
            if (error) {
                setError(error.message);
            } else {
                setData(data?.[0] || null);
            }
            setLoading(false);
        };
        fetchData();
    }, [sportiv_id]);

    return { data, loading, error };
};
