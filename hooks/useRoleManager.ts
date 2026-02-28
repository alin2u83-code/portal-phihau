import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { useLocalStorage } from './useLocalStorage';

export const useRoleManager = (userId: string | undefined) => {
    const { showError } = useError();
    const [loading, setLoading] = useState(false);
    const [, setActiveRoleContextId] = useLocalStorage<string | null>('phi-hau-active-role-context-id', null);

    const switchRole = useCallback(async (newContextId: string) => {
        if (!supabase) {
            showError("Eroare", "Clientul Supabase nu este configurat.");
            return;
        }
        if (!userId) {
            showError("Eroare", "ID-ul utilizatorului nu este disponibil.");
            return;
        }

        setLoading(true);
        try {
            // Apelează funcția RPC pentru a schimba contextul primar
            const { error: rpcError } = await supabase.rpc('switch_primary_context', {
                p_target_context_id: newContextId
            });

            if (rpcError) throw rpcError;

            // Reîmprospătează sesiunea pentru a citi noile metadate din JWT
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;

            // Salvăm în local storage și dăm refresh
            setActiveRoleContextId(newContextId);
            window.location.reload();
        } catch (error: any) {
            showError("Eroare la schimbarea rolului", error.message);
        } finally {
            setLoading(false);
        }
    }, [userId, showError, setActiveRoleContextId]);

    return { switchRole, loading };
};

