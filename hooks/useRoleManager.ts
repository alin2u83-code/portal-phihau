import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { useLocalStorage } from './useLocalStorage';

export const useRoleManager = (userId: string | undefined) => {
    const { showError } = useError();
    const [loading, setLoading] = useState(false);
    const [, setActiveRoleContextId] = useLocalStorage<string | null>('phi-hau-active-role-context-id', null);

    const switchRole = useCallback(async (newContextId: string) => {
        if (!userId) {
            showError("Eroare", "ID-ul utilizatorului nu este disponibil.");
            return;
        }

        setLoading(true);
        try {
            const { data: allUserRoles, error: fetchError } = await supabase
                .from('utilizator_roluri_multicont')
                .select('*')
                .eq('user_id', userId);

            if (fetchError) throw fetchError;

            const targetContext = allUserRoles.find(r => r.id === newContextId);

            if (!targetContext) {
                throw new Error("Contextul selectat nu a fost găsit pentru acest utilizator.");
            }

            // Set the new active role in localStorage
            setActiveRoleContextId(newContextId);

            // Check for sportiv_id and set redirect if necessary
            if (targetContext.sportiv_id) {
                localStorage.setItem('phi-hau-redirect-after-role-switch', 'my-portal');
            }

            // Hard refresh to re-initialize the app with the new context
            window.location.reload();

        } catch (error: any) {
            showError("Eroare la schimbarea rolului", error.message);
        } finally {
            // Although the page reloads, this is good practice
            setLoading(false);
        }
    }, [userId, showError, setActiveRoleContextId]);

    return { switchRole, loading };
};

