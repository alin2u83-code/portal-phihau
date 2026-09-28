import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MFA_REQUIRED_ROLES } from './useMFAGuard';
import {
    CHEIE_ULTIMA_ACTIVITATE,
    CHEIE_MOTIV_DELOGARE,
    calculeazaUltimaActivitate,
    stareInactivitate,
} from '../utils/inactivitate';
import toast from 'react-hot-toast';

const INTERVAL_VERIFICARE_MS = 30 * 1000;
const THROTTLE_SCRIERE_MS = 15 * 1000;
const EVENIMENTE_ACTIVITATE = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

function citesteTimestampStocat(): number | null {
    const raw = localStorage.getItem(CHEIE_ULTIMA_ACTIVITATE);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

/**
 * D-08: delogare automată după 60 de minute de inactivitate, DOAR pentru
 * rolurile din MFA_REQUIRED_ROLES (acces date financiare). Control client-side
 * — protejează sesiunile lăsate deschise pe calculatoare partajate din
 * cluburi; nu protejează împotriva unui refresh token furat.
 */
export function useExpirareInactivitate(activeRoleContext: any | null, onExpirare: () => void): void {
    const onExpirareRef = useRef(onExpirare);
    onExpirareRef.current = onExpirare;

    const rolActiv = activeRoleContext?.roluri?.nume || activeRoleContext?.rol_denumire;
    const activ = MFA_REQUIRED_ROLES.includes(rolActiv);

    useEffect(() => {
        if (!activ || !supabase) return;

        let avertizareAfisata = false;
        let expirareDeclansata = false;
        let ultimaScriereLocala = 0;

        const scrieActivitate = (forteaza: boolean = false) => {
            const acum = Date.now();
            if (!forteaza && acum - ultimaScriereLocala < THROTTLE_SCRIERE_MS) return;
            ultimaScriereLocala = acum;
            localStorage.setItem(CHEIE_ULTIMA_ACTIVITATE, String(acum));
            avertizareAfisata = false;
        };

        const verifica = () => {
            if (expirareDeclansata) return;
            const stocat = citesteTimestampStocat();
            const acum = Date.now();
            const ultimaActivitate = stocat ?? acum;
            const stare = stareInactivitate(ultimaActivitate, acum);

            if (stare === 'expirat') {
                expirareDeclansata = true;
                clearInterval(intervalId);
                EVENIMENTE_ACTIVITATE.forEach(ev => window.removeEventListener(ev, handlerActivitate));
                sessionStorage.setItem(CHEIE_MOTIV_DELOGARE, 'inactivitate');
                toast.dismiss('avertizare-inactivitate');
                onExpirareRef.current();
            } else if (stare === 'avertizare' && !avertizareAfisata) {
                avertizareAfisata = true;
                toast('Sesiunea se va închide în 5 minute din cauza inactivității. Mișcă mouse-ul sau apasă o tastă pentru a rămâne conectat.', {
                    id: 'avertizare-inactivitate',
                    duration: 60000,
                });
            }
        };

        const handlerActivitate = () => scrieActivitate();

        (async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const lastSignInAt = sessionData?.session?.user?.last_sign_in_at;
            const acum = Date.now();
            const ultimaActivitate = calculeazaUltimaActivitate(citesteTimestampStocat(), lastSignInAt, acum);
            localStorage.setItem(CHEIE_ULTIMA_ACTIVITATE, String(ultimaActivitate));
            verifica();
        })();

        EVENIMENTE_ACTIVITATE.forEach(ev => window.addEventListener(ev, handlerActivitate, { passive: true }));
        const intervalId = setInterval(verifica, INTERVAL_VERIFICARE_MS);

        return () => {
            clearInterval(intervalId);
            EVENIMENTE_ACTIVITATE.forEach(ev => window.removeEventListener(ev, handlerActivitate));
        };
    }, [activ, rolActiv]);
}
