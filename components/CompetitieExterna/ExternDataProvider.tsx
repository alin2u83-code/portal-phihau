import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { DataContext } from '../../contexts/DataContext';
import { Button, Card } from '../ui';

interface ExternDataProviderProps {
    clubId: string;
    clubNume: string;
    competitieId: string;
    userId: string;
    contextId: string;
    rol: string;
    children: React.ReactNode;
}

// Fără retry în cascadă la 401/403: RLS a refuzat deja, repetarea nu ajută.
const faraRetryPeAuth = (count: number, err: any) => {
    const status = err?.status ?? err?.code;
    if (status === 401 || status === 403 || status === '42501') return false;
    return count < 2;
};

/**
 * Provider de date minimal pentru zona externă (D-07, D-08): înlocuiește DataProvider-ul portalului.
 * Expune doar câmpurile citite de CompetitieDetail și descendenții lui; sportivii vin doar cu câmpurile minime de înscriere (fără date de contact).
 */
export const ExternDataProvider: React.FC<ExternDataProviderProps> = ({ clubId, clubNume, competitieId, userId, contextId, rol, children }) => {
    const sportiviQ = useQuery({
        queryKey: ['extern', clubId, 'sportivi'],
        retry: faraRetryPeAuth,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, status, club_id, grad_actual_id, data_nasterii, data_inscrierii, gen')
                .eq('club_id', clubId) // defense in depth; poarta reală este RLS
                .order('nume');
            if (error) throw error;
            return data ?? [];
        },
    });

    const gradeQ = useQuery({
        queryKey: ['extern', 'grade'],
        retry: faraRetryPeAuth,
        queryFn: async () => {
            const { data, error } = await supabase.from('grade').select('*');
            if (error) throw error;
            return data ?? [];
        },
    });

    const vizeQ = useQuery({
        queryKey: ['extern', clubId, 'vize', competitieId],
        retry: faraRetryPeAuth,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('vize_club_competitie', { p_competitie: competitieId, p_club: clubId });
            if (error) { console.warn('vize_club_competitie:', error.message); return []; } // listă goală => avertisment FRAM (sigur)
            return data ?? [];
        },
    });

    const valoare = useMemo(() => {
        const cluburi = { id: clubId, nume: clubNume };
        const sportivi = (sportiviQ.data ?? []).map((s: any) => ({ ...s, cluburi }));
        const vizeSportivi = (vizeQ.data ?? []).map((v: any) => ({
            id: `${v.sportiv_id}-${v.an}-${v.tip}`,
            sportiv_id: v.sportiv_id,
            an: v.an,
            tip: v.tip,
            scutit: false,
            plata: v.achitata ? { status: 'Achitat' } : null,
            plata_id: null,
            club_id: clubId,
            status_viza: 'Activ',
            data_platii: '',
        }));
        return {
            sportivi,
            filteredData: { sportivi },
            grade: gradeQ.data ?? [],
            vizeSportivi,
            clubs: [],
            currentUser: { id: userId, club_id: clubId, cluburi, roluri: [] },
            activeRoleContext: { id: contextId, club_id: clubId, rol_denumire: rol, roluri: { nume: rol } },
        } as unknown as React.ContextType<typeof DataContext>;
    }, [sportiviQ.data, gradeQ.data, vizeQ.data, clubId, clubNume, userId, contextId, rol]);

    if (sportiviQ.isLoading || gradeQ.isLoading) {
        return <div className="p-6 text-center text-sm text-[var(--t-text)]">Se încarcă...</div>;
    }
    if (sportiviQ.error || gradeQ.error) {
        return (
            <Card className="text-center space-y-3">
                <p className="text-sm text-[var(--t-text)]">Nu am putut încărca datele clubului. Încearcă din nou.</p>
                <Button onClick={() => { sportiviQ.refetch(); gradeQ.refetch(); }}>Reîncearcă</Button>
            </Card>
        );
    }

    return <DataContext.Provider value={valoare}>{children}</DataContext.Provider>;
};
