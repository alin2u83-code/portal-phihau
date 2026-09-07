import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { esteMfaEmailValid } from '../services/emailMfaService';

// MFA obligatoriu doar pentru rolurile cu acces la date sensibile (financiar/medical).
// Per D-02 (17-CONTEXT.md): blocare imediata, fara perioada de gratie, fara toggle.
// 'ADMIN' nu e inclus: verificat live in DB (roluri.nume) — exista un rand legacy 'Admin'
// (case diferit fata de codul care ar face match, oricum) cu 0 utilizatori asignati.
export const MFA_REQUIRED_ROLES = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'];

export function useMFAGuard(activeRoleContext: any | null) {
    const { navigateTo, activeView } = useNavigation();
    const [mfaChecked, setMfaChecked] = useState(false);

    useEffect(() => {
        if (!activeRoleContext) return;
        if (activeView === 'setup-mfa') {
            setMfaChecked(true);
            return;
        }

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;
        const isPrivilegedRole = MFA_REQUIRED_ROLES.includes(roleName);

        if (!isPrivilegedRole) {
            setMfaChecked(true);
            return;
        }

        supabase?.auth.getUser().then(({ data, error }) => {
            if (error || !data.user) {
                // Fail-open documentat: eroare de retea nu blocheaza accesul (tradeoff deliberat).
                console.error('[useMFAGuard] getUser failed:', error?.message);
                setMfaChecked(true);
                return;
            }
            esteMfaEmailValid(data.user.id).then(valid => {
                if (!valid) {
                    navigateTo('setup-mfa');
                    return; // NU seta mfaChecked=true aici — App.tsx randeaza gate cat timp e false
                }
                setMfaChecked(true);
            });
        });
    }, [activeRoleContext, activeView]);

    return { mfaChecked };
}
