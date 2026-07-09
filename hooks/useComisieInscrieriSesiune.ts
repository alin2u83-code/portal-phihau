import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { InscriereExamen } from '../types';

// Cand userul curent e membru al comisiei unei sesiuni de examen, acest hook
// aduce TOTI participantii sesiunii (indiferent de club) - lista globala din
// DataContext e scopata pe clubul activ si nu i-ar contine pe cei din alte cluburi.
export const useComisieInscrieriSesiune = (sesiuneId: string | undefined) => {
    const [isComisie, setIsComisie] = useState(false);
    const [inscrieriCrossClub, setInscrieriCrossClub] = useState<InscriereExamen[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!sesiuneId || !supabase) {
            setIsComisie(false);
            setInscrieriCrossClub(null);
            return;
        }

        (async () => {
            setLoading(true);
            const { data: membru, error: membruError } = await supabase.rpc('is_comisie_member', { p_sesiune_id: sesiuneId });
            if (cancelled) return;
            if (membruError || !membru) {
                setIsComisie(false);
                setInscrieriCrossClub(null);
                setLoading(false);
                return;
            }
            setIsComisie(true);

            const { data, error } = await supabase
                .from('vedere_detalii_examen')
                .select('*, id:inscriere_id')
                .eq('sesiune_id', sesiuneId);
            if (cancelled) return;
            if (!error && data) setInscrieriCrossClub(data as InscriereExamen[]);
            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [sesiuneId]);

    return { isComisie, inscrieriCrossClub, loading };
};
