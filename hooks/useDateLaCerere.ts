import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import type { CheieLaCerere } from '../types';

// Ecranul cere doar datele lui (Faza 38 D-01): seturile mari nu se mai incarca la pornire.
// seIncarca = cel putin o cheie ceruta nu a sosit inca; ecranul trebuie sa arate loading, nu "nicio inregistrare".
export function useDateLaCerere(chei: CheieLaCerere[]): { seIncarca: boolean } {
    const { incarcaLaCerere, cheiIncarcate } = useData();
    const cheie = chei.join(',');

    useEffect(() => {
        incarcaLaCerere(chei);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incarcaLaCerere, cheie]);

    return { seIncarca: chei.some(k => !cheiIncarcate.has(k)) };
}
