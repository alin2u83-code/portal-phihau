import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface RegistrationDetails {
    grad_sugerat_id: string;
    grad_sugerat_nume: string;
    taxa_suma: number;
    is_debtor: boolean;
}

export const useExamenRegistration = (sportiv_id: string | undefined) => {
    const [data, setData] = useState<RegistrationDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!sportiv_id) return;
        
        setLoading(true);
        setError(null);
        try {
            const { data: result, error: rpcError } = await supabase.rpc('get_registration_details', { 
                p_sportiv_id: sportiv_id 
            });
            
            if (rpcError) throw rpcError;
            
            if (result && result.length > 0) {
                setData(result[0] as RegistrationDetails);
            } else {
                setData(null);
            }
        } catch (err: any) {
            console.error('Error fetching registration details:', err);
            setError(err.message || 'Eroare la preluarea detaliilor de înscriere.');
        } finally {
            setLoading(false);
        }
    }, [sportiv_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
};
