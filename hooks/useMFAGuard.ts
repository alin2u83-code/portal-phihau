import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';
import { useAppStore } from '../src/store/useAppStore';
import { stareMfa } from '../services/emailMfaService';

// Reverificarea la navigare se face cel mult o data la 5 minute (WR-B: evita RPC + blip de retea la fiecare view).
const INTERVAL_REVERIFICARE_MS = 5 * 60 * 1000;
// W2: cat timp starea 'eroare' mentine poarta deschisa intr-o sesiune deja verificata; dupa asta, fail-closed.
const TOLERANTA_EROARE_MS = 30 * 60 * 1000;

// MFA obligatoriu doar pentru rolurile cu acces la date sensibile (financiar/medical).
// Per D-02 (17-CONTEXT.md): blocare imediata, fara perioada de gratie, fara toggle.
// 'ADMIN' nu e inclus: verificat live in DB (roluri.nume) — exista un rand legacy 'Admin'
// (case diferit fata de codul care ar face match, oricum) cu 0 utilizatori asignati.
export const MFA_REQUIRED_ROLES = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'];

export function useMFAGuard(activeRoleContext: any | null) {
    const { navigateTo, activeView } = useNavigation();
    const [mfaChecked, setMfaChecked] = useState(false);
    const setMfaContextId = useAppStore(s => s.setMfaContextId);
    const contextVerificatRef = useRef<string | null>(null);
    const ultimaVerificareRef = useRef<{ ctx: string; ts: number } | null>(null);

    useEffect(() => {
        if (!activeRoleContext) return;

        // WR-04: la schimbare de context verificarea se reia de la zero (poarta se inchide).
        if (contextVerificatRef.current !== activeRoleContext.id) {
            contextVerificatRef.current = activeRoleContext.id;
            ultimaVerificareRef.current = null;
            setMfaChecked(false);
            setMfaContextId(null);
        }

        // Pagina MFA se randeaza prin exceptia din App.tsx (activeView === 'setup-mfa'); NU deschide poarta datelor (Faza 38 D-02).
        if (activeView === 'setup-mfa') return;

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;
        const isPrivilegedRole = MFA_REQUIRED_ROLES.includes(roleName);
        let anulat = false; // CR-01: doar ultima rulare a efectului are voie sa decida (verificari concurente la refreshRoles)
        const treceMfa = () => {
            setMfaChecked(true);
            setMfaContextId(activeRoleContext.id);
        };
        // Fail-closed: orice eroare/exceptie = MFA netrecut. Poarta datelor se inchide, utilizatorul merge pe ecranul MFA.
        const blocheaza = () => {
            ultimaVerificareRef.current = null;
            setMfaChecked(false);
            setMfaContextId(null);
            navigateTo('setup-mfa');
        };

        if (!isPrivilegedRole) {
            treceMfa();
            return;
        }

        const deja = ultimaVerificareRef.current;
        const trecutRecent = deja?.ctx === activeRoleContext.id && Date.now() - deja.ts < INTERVAL_REVERIFICARE_MS;
        if (trecutRecent) return;
        const eraTrecut = deja?.ctx === activeRoleContext.id && Date.now() - deja.ts < TOLERANTA_EROARE_MS;

        // getSession = citire locala; getUser (/auth/v1/user) a durat 9 s sub incarcare (Faza 38, ca in SetupMFAPage).
        (async () => {
            try {
                const { data, error } = await supabase!.auth.getSession();
                const userId = data?.session?.user?.id;
                if (anulat) return;
                if (error || !userId) {
                    console.error('[useMFAGuard] getSession failed:', error?.message);
                    blocheaza();
                    return;
                }
                const stare = await stareMfa(userId); // include dispozitivul de incredere
                if (anulat) return;
                if (stare === 'valid') {
                    ultimaVerificareRef.current = { ctx: activeRoleContext.id, ts: Date.now() };
                    treceMfa();
                } else if (stare === 'eroare' && eraTrecut) {
                    // WR-B: blip de retea intr-o sesiune deja verificata nu te muta pe ecranul MFA; reincerci la urmatoarea navigare
                    console.warn('[useMFAGuard] reverificare MFA indisponibila, se pastreaza starea verificata');
                } else {
                    blocheaza(); // 'invalid' sau prima verificare esuata = fail-closed
                }
            } catch (e) {
                console.error('[useMFAGuard] verificare MFA esuata:', e);
                if (!anulat) blocheaza();
            }
        })();

        return () => { anulat = true; };
    }, [activeRoleContext, activeView]);

    return { mfaChecked };
}
