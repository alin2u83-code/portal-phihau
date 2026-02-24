import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata, 
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, 
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, VizualizarePlata, IstoricPlataDetaliat
} from '../types';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { withCleanUuidFilters } from '../utils/supabaseFilters';
import { processSettledQueries } from '../utils/supabaseHelpers';

export interface AppData {
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    antrenamente: Antrenament[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    allRoles: Rol[];
    anunturiPrezenta: AnuntPrezenta[];
    reduceri: Reducere[];
    tipuriPlati: TipPlata[];
    locatii: Locatie[];
    clubs: Club[];
    deconturiFederatie: DecontFederatie[];
    vizualizarePlati: VizualizarePlata[];
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    antrenamente: [], grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], anunturiPrezenta: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [], vizualizarePlati: [],
    istoricPlatiDetaliat: []
};

export const useDataProvider = () => {
    const [data, setData] = useState<AppData>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [activeRoleContext, setActiveRoleContext] = useState<any | null>(null);
    const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

    const initializeAndFetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");

            let { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                setSession(null);
                setLoading(false);
                return;
            }

            setSession(currentSession);
            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);

            // Verificam si setam contextul de rol, daca e necesar
            if (!currentSession.user?.user_metadata?.rol_activ_context) {
                try {
                    const { error: rpcError } = await supabase.rpc('set_primary_context');
                    if (rpcError) throw new Error(`Eroare la setarea contextului de rol: ${rpcError.message}`);
                    
                    // Re-fetch session pentru a avea metadatele actualizate
                    const { data: { session: updatedSession } } = await supabase.auth.getSession();
                    if (!updatedSession) throw new Error('Sesiunea nu a putut fi reîmprospătată după setarea contextului.');
                    currentSession = updatedSession;
                } catch (rpcError: any) {
                    console.warn('RPC set_primary_context not available, proceeding without it:', rpcError.message);
                }
            }

            // Fetch Roluri Utilizator
            const { data: roles, error: rolesError } = await supabase
                .from('utilizator_roluri_multicont')
                .select(`id, rol_id, sportiv_id, club_id, is_primary, rol_denumire, roluri:rol_id(nume), club:club_id(nume), sportiv:sportiv_id(*)`)
                .eq('user_id', currentSession.user.id);

            if (rolesError) throw rolesError;
            if (!roles || roles.length === 0) {
                setNeedsRoleSelection(true);
                setLoading(false);
                return;
            }

            const savedRoleId = localStorage.getItem('phi-hau-active-role-context-id')?.replace(/"/g, '');
            let activeCtx = (roles.find(r => r.id === savedRoleId) || roles.find(r => r.is_primary) || roles[0]) as any;

            if (!activeCtx) {
                setNeedsRoleSelection(true);
                setLoading(false);
                return;
            }
            
            setActiveRoleContext(activeCtx);
            setUserRoles(roles);

            const profile = activeCtx.sportiv;
            setCurrentUser((profile || {
                id: currentSession.user.id,
                email: currentSession.user.email,
                nume: 'Utilizator',
                prenume: 'Sistem',
                roluri: roles.map((r: any) => r.roluri)
            }) as any);

            const cleanClubId = (activeCtx.club_id && activeCtx.club_id !== 'null') ? activeCtx.club_id : null;
            const activeRoleName = Array.isArray(activeCtx.roluri) ? activeCtx.roluri[0]?.nume : activeCtx.roluri?.nume;

            if (cleanClubId || activeRoleName === 'SUPER_ADMIN_FEDERATIE') {
                const queries: Record<string, any> = {
                    clubs: cleanedSupabase.from('cluburi').select('*'),
                    allRoles: cleanedSupabase.from('roluri').select('*'),
                    grade: cleanedSupabase.from('grade').select('*'),
                    grupe: cleanedSupabase.from('grupe').select('*, program:orar_saptamanal!grupa_id(*)'),
                    tipuriAbonament: cleanedSupabase.from('tipuri_abonament').select('*'),
                    locatii: cleanedSupabase.from('nom_locatii').select('*'),
                    tipuriPlati: cleanedSupabase.from('tipuri_plati').select('*'),
                    reduceri: cleanedSupabase.from('reduceri').select('*'),
                    sportiviRaw: cleanedSupabase.from('sportivi').select('*, cluburi(*), utilizator_roluri_multicont(rol_denumire)'),
                    sesiuniExamene: cleanedSupabase.from('sesiuni_examene').select('*'),
                    inscrieriExamene: cleanedSupabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)'),
                    antrenamente: cleanedSupabase.from('program_antrenamente').select('*, grupe(*), prezenta:prezenta_antrenament!antrenament_id(sportiv_id, status)'),
                    plati: cleanedSupabase.from('plati').select('*'),
                    tranzactii: cleanedSupabase.from('tranzactii').select('*'),
                    evenimente: cleanedSupabase.from('evenimente').select('*'),
                    rezultate: cleanedSupabase.from('rezultate').select('*'),
                    familii: cleanedSupabase.from('familii').select('*'),
                    anunturiPrezenta: cleanedSupabase.from('anunturi_prezenta').select('*'),
                    preturiConfig: cleanedSupabase.from('preturi_config').select('*'),
                    vizualizarePlati: cleanedSupabase.from('view_plata_sportiv').select('*'),
                    istoricPlatiDetaliat: cleanedSupabase.from('view_istoric_plati_detaliat').select('*'),
                    deconturiFederatie: cleanedSupabase.from('deconturi_federatie').select('*'),
                    istoricGrade: cleanedSupabase.from('istoric_grade').select('*'),
                };

                const queryKeys = Object.keys(queries);
                const settledResults = await Promise.allSettled(Object.values(queries)) as any;
                const { data: processedData, rlsErrors } = processSettledQueries(settledResults, queryKeys);

                if (rlsErrors.length > 0) {
                    setError(`RLS Error: Access denied for ${rlsErrors.join(', ')}`);
                }

                const { 
                    clubs: cData, allRoles: rData, grade: gData, grupe: grpData, tipuriAbonament: subData, 
                    locatii: locData, tipuriPlati: pTypeData, reduceri: redData, sportiviRaw: sRaw, 
                    sesiuniExamene: sessData, inscrieriExamene: regData, antrenamente: trainData, 
                    plati: payData, tranzactii: trData, evenimente: evData, rezultate: resData, 
                    familii: famData, anunturiPrezenta: annData, preturiConfig: prcData, 
                    vizualizarePlati: vPayData, istoricPlatiDetaliat: istPayData, deconturiFederatie: decData, istoricGrade: istGData
                } = processedData;

                const allSportivi = (sRaw || []).map((s: any) => ({
                    ...s,
                    cluburi: s.cluburi || {},
                    roluri: (s.utilizator_roluri_multicont || [])
                        .map((jr: any) => rData.find((r: any) => r.nume === jr.rol_denumire))
                        .filter(Boolean)
                }));

                setData({
                    clubs: cData, allRoles: rData, grade: gData, grupe: grpData, tipuriAbonament: subData,
                    locatii: locData, tipuriPlati: pTypeData, reduceri: redData, sportivi: allSportivi,
                    sesiuniExamene: sessData, inscrieriExamene: regData, antrenamente: trainData,
                    plati: payData, tranzactii: trData, evenimente: evData, rezultate: resData,
                    familii: famData, anunturiPrezenta: annData, preturiConfig: prcData,
                    vizualizarePlati: vPayData, istoricPlatiDetaliat: istPayData, deconturiFederatie: decData, istoricGrade: istGData
                } as AppData);
            }
        } catch (err: any) {
            console.error("Critical Fetch Error:", err);
            if (err.message.includes('network')) {
                setError('Eroare de rețea. Verificați conexiunea la internet.');
            } else if (err.message.includes('403') || err.message.includes('RLS')) {
                setError('Acces Refuzat. Nu aveți permisiunile necesare.');
            } else {
                setError(`A apărut o eroare neașteptată: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initializeAndFetchData();
        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) initializeAndFetchData();
        });
        return () => subscription.unsubscribe();
    }, [initializeAndFetchData]);

    const createSetter = <K extends keyof AppData>(key: K) => 
        useCallback((value: React.SetStateAction<AppData[K]>) => {
            setData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as any)(prev[key]) : value }));
        }, []);

    return { 
        ...data, 
        loading, 
        error, 
        needsRoleSelection, 
        session, 
        currentUser, 
        userRoles, 
        activeRoleContext, 
        setCurrentUser,
        setSportivi: createSetter('sportivi'),
        setSesiuniExamene: createSetter('sesiuniExamene'),
        setInscrieriExamene: createSetter('inscrieriExamene'),
        setIstoricGrade: createSetter('istoricGrade'),
        setAntrenamente: createSetter('antrenamente'),
        setPlati: createSetter('plati'),
        setTranzactii: createSetter('tranzactii'),
        setEvenimente: createSetter('evenimente'),
        setRezultate: createSetter('rezultate'),
        setFamilii: createSetter('familii'),
        setPreturiConfig: createSetter('preturiConfig'),
        setClubs: createSetter('clubs'),
        setAllRoles: createSetter('allRoles'),
        setGrade: createSetter('grade'),
        setGrupe: createSetter('grupe'),
        setTipuriAbonament: createSetter('tipuriAbonament'),
        setLocatii: createSetter('locatii'),
        setTipuriPlati: createSetter('tipuriPlati'),
        setReduceri: createSetter('reduceri'),
        setDeconturiFederatie: createSetter('deconturiFederatie'),
        setAnunturiPrezenta: createSetter('anunturiPrezenta'),
        setVizualizarePlati: createSetter('vizualizarePlati'),
    };
};