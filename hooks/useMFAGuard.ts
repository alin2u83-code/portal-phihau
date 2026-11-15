import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { useAppStore } from '../src/store/useAppStore';
import { esteMfaEmailValid, esteDispozitivDeIncredere } from '../services/emailMfaService';

// MFA obligatoriu doar pentru rolurile cu acces la date sensibile (financiar/medical).
// Per D-02 (17-CONTEXT.md): blocare imediata, fara perioada de gratie, fara toggle.
// 'ADMIN' nu e inclus: verificat live in DB (roluri.nume) — exista un rand legacy 'Admin'
// (case diferit fata de codul care ar face match, oricum) cu 0 utilizatori asignati.
export const MFA_REQUIRED_ROLES = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'];

export function useMFAGuard(activeRoleContext: any | null) {
    const { navigateTo, activeView } = useNavigation();
    const [mfaChecked, setMfaChecked] = useState(false);
    const setMfaContextId = useAppStore(s => s.setMfaContextId);

    useEffect(() => {
        if (!activeRoleContext) return;
        if (activeView === 'setup-mfa') {
            // Permisiune de randare pentru pagina MFA, NU trecere: datele raman blocate (Faza 38 D-02).
            setMfaChecked(true);
            return;
        }

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;
        const isPrivilegedRole = MFA_REQUIRED_ROLES.includes(roleName);
        const treceMfa = () => {
            setMfaChecked(true);
            setMfaContextId(activeRoleContext.id);
        };

        if (!isPrivilegedRole) {
            treceMfa();
            return;
        }

        // getSession = citire locala; getUser (/auth/v1/user) a durat 9 s sub incarcare (Faza 38, ca in SetupMFAPage).
        supabase?.auth.getSession().then(({ data, error }) => {
            const userId = data?.session?.user?.id;
            if (error || !userId) {
                // Fail-open documentat: eroare de retea nu blocheaza accesul (tradeoff deliberat).
                console.error('[useMFAGuard] getSession failed:', error?.message);
                treceMfa();
                return;
            }
            esteMfaEmailValid(userId)
                .then(valid => valid || esteDispozitivDeIncredere(userId)) // dispozitiv de incredere (7 zile) = fara cod
                .then(valid => {
                    if (!valid) {
                        navigateTo('setup-mfa');
                        return; // NU seta mfaChecked=true aici — App.tsx randeaza gate cat timp e false
                    }
                    treceMfa();
                });
        });
    }, [activeRoleContext, activeView]);

    return { mfaChecked };
}
