import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useData } from '../contexts/DataContext';
import { useError } from '../components/ErrorProvider';
import { reincarcaDateTaxe } from '../services/taxeAnualeService';
import type { DateTaxeReincarcate } from '../services/taxeAnualeService';

/**
 * Reincarca vizele / decont_sportivi / deconturile / pretul taxelor in DataContext si invalideaza
 * query-ul `plati` (facturile taxelor se creeaza prin RPC). Intoarce datele reincarcate ca apelantul
 * sa poata calcula imediat, fara sa astepte re-randarea contextului; null la eroare.
 */
export function useReincarcaTaxe(): () => Promise<DateTaxeReincarcate | null> {
    const { setVizeSportivi, setDecontSportivi, setDeconturiFederatie, setTaxaAnualaFederatieConfig } = useData();
    const queryClient = useQueryClient();
    const { showError } = useError();

    return useCallback(async () => {
        const { data, error } = await reincarcaDateTaxe();
        if (error || !data) {
            showError('Reîncărcare taxe', error ?? 'Datele taxelor nu au putut fi reîncărcate.');
            return null;
        }
        setVizeSportivi(data.vize);
        setDecontSportivi(data.decontSportivi);
        setDeconturiFederatie(data.deconturi);
        setTaxaAnualaFederatieConfig(data.config);
        await queryClient.invalidateQueries({ queryKey: ['plati'] });
        return data;
    }, [setVizeSportivi, setDecontSportivi, setDeconturiFederatie, setTaxaAnualaFederatieConfig, queryClient, showError]);
}
