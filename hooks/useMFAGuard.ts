import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';

const ADMIN_ROLES = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE', 'ADMIN'];

export function useMFAGuard(activeRoleContext: any | null) {
    const { navigateTo, activeView } = useNavigation();
    const [mfaChecked, setMfaChecked] = useState(false);

    useEffect(() => {
        if (!activeRoleContext) return;
        // Nu redirecta dacă ești deja pe pagina de setup MFA
        if (activeView === 'setup-mfa') {
            setMfaChecked(true);
            return;
        }

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;
        const isAdminRole = ADMIN_ROLES.includes(roleName);

        if (!isAdminRole) {
            setMfaChecked(true);
            return;
        }

        supabase?.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
            if (error) {
                // Fail open: eroare de rețea nu trebuie să blocheze accesul
                console.error('[useMFAGuard] MFA level check failed:', error.message);
                setMfaChecked(true);
                return;
            }
            const currentLevel = data?.currentLevel;
            const nextLevel = data?.nextLevel;
            if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
                navigateTo('setup-mfa');
            } else if (!nextLevel || nextLevel === 'aal1') {
                navigateTo('setup-mfa');
            }
            setMfaChecked(true);
        });
    }, [activeRoleContext, activeView]);

    return { mfaChecked };
}
