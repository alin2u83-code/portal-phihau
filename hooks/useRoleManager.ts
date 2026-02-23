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
            // 1. Resetăm toate rolurile utilizatorului la is_primary = false
            await supabase
                .from('utilizator_roluri_multicont')
                .update({ is_primary: false })
                .eq('user_id', userId);

            // 2. Setăm noul rol ca is_primary = true
            const { error: updateError } = await supabase
                .from('utilizator_roluri_multicont')
                .update({ is_primary: true })
                .eq('id', newContextId);

            if (updateError) throw updateError;

            // 3. Salvăm în local storage și dăm refresh
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

