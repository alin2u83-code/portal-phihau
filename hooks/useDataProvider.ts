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
import { useUserRoles } from './useUserRoles';
import { useFilteredData } from './useFilteredData';
import { useAttendanceData } from './useAttendanceData';

export interface AppData {
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    allRoles: Rol[];
    reduceri: Reducere[];
    tipuriPlati: TipPlata[];
    locatii: Locatie[];
    clubs: Club[];
    deconturiFederatie: DecontFederatie[];
    vizualizarePlati: VizualizarePlata[];
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    istoricPrezenta: any[];
    filteredData?: any; // Add filteredData to interface
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [], vizualizarePlati: [],
    istoricPlatiDetaliat: [], istoricPrezenta: []
};

export const useDataProvider = () => {
    const [data, setData] = useState<AppData>(initialData);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingIstoric, setLoadingIstoric] = useState(false);
    const lastFetchedSportivId = React.useRef<string | null>(null);

    // Use the new hook for user roles
    const { 
        userRoles, 
        activeRoleContext, 
        loading: rolesLoading, 
        error: rolesError, 
        needsRoleSelection, 
        refreshRoles,
        setActiveRoleContext
    } = useUserRoles(session?.user?.id);

    // Derive active role and club for filtering
    const activeRole = activeRoleContext?.roluri?.nume || null;
    const activeClubId = (activeRoleContext?.club_id && activeRoleContext.club_id !== 'null') ? activeRoleContext.club_id : null;

    const attendanceData = useAttendanceData(activeClubId);

    // Use the filtering hook internally
    const filteredData = useFilteredData({
        activeRole,
        activeClubId,
        sportivi: data.sportivi,
        sesiuniExamene: data.sesiuniExamene,
        inscrieriExamene: data.inscrieriExamene,
        antrenamente: attendanceData.antrenamente,
        grupe: data.grupe,
        plati: data.plati,
        tranzactii: data.tranzactii,
        evenimente: data.evenimente,
        rezultate: data.rezultate,
        tipuriAbonament: data.tipuriAbonament,
        familii: data.familii,
        anunturiPrezenta: attendanceData.anunturiPrezenta,
        reduceri: data.reduceri,
        deconturiFederatie: data.deconturiFederatie,
        istoricGrade: data.istoricGrade,
        vizualizarePlati: data.vizualizarePlati,
        istoricPlatiDetaliat: data.istoricPlatiDetaliat
    });

    const fetchIstoricVedere = useCallback(async (sportivId: string, silent = false) => {
        lastFetchedSportivId.current = sportivId;
        if (!silent) setLoadingIstoric(true);
        
        let query = supabase
            .from('vedere_prezenta_sportiv')
            .select('*')
            .eq('sportiv_id', sportivId);

        // Add club_id filter if available in context
        if (activeRoleContext?.club_id && activeRoleContext.club_id !== 'null') {
            query = query.eq('club_id', activeRoleContext.club_id);
        }

        const { data, error } = await query.order('data', { ascending: false });

        if (!error && data) {
            setData(prev => ({ ...prev, istoricPrezenta: data }));
        }
        if (!silent) setLoadingIstoric(false);
    }, [activeRoleContext]);

    useEffect(() => {
        if (currentUser?.id) {
            fetchIstoricVedere(currentUser.id);

            const subscription = supabase
                .channel('prezenta_antrenament_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'prezenta_antrenament' },
                    () => {
                        // Refetch when attendance changes (silent to prevent UI flash)
                        // Use lastFetchedSportivId to support admin viewing another sportiv
                        if (lastFetchedSportivId.current) {
                            fetchIstoricVedere(lastFetchedSportivId.current, true);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [currentUser?.id, fetchIstoricVedere]);

    // Function to fetch application data based on active context
    const fetchAppData = useCallback(async (activeCtx: any) => {
        try {
            setLoadingData(true);
            setError(null);
            
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");
            
            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);

            const cleanClubId = (activeCtx.club_id && activeCtx.club_id !== 'null') ? activeCtx.club_id : null;
            const profile = activeCtx.sportiv;
            // We set currentUser here based on the active context
            const currentRoles = userRoles.map((r: any) => ({
                ...r.roluri,
                id: r.id // Use the assignment ID as the unique identifier
            })).filter(role => role.nume);
            
            setCurrentUser({
                ...(profile || {
                    id: session?.user.id,
                    user_id: session?.user.id,
                    email: session?.user.email,
                    nume: 'Utilizator',
                    prenume: 'Sistem',
                }),
                roluri: currentRoles,
                club_id: cleanClubId
            } as any);

            const activeRoleName = Array.isArray(activeCtx.roluri) ? activeCtx.roluri[0]?.nume : activeCtx.roluri?.nume;
            const isSuperAdmin = activeRoleName === 'SUPER_ADMIN_FEDERATIE';
            const isAdminClub = activeRoleName === 'ADMIN_CLUB' || activeRoleName === 'Admin Club';
            const isSportiv = activeRoleName === 'SPORTIV';

            if (cleanClubId || isSuperAdmin || isAdminClub) {
                const queries: Record<string, any> = {
                    clubs: cleanedSupabase.from('cluburi').select('*'),
                    allRoles: cleanedSupabase.from('roluri').select('*'),
                    grade: cleanedSupabase.from('grade').select('*'),
                    grupe: cleanedSupabase.from('grupe').select('*, program:orar_saptamanal!grupa_id(*)'),
                    tipuriAbonament: cleanedSupabase.from('tipuri_abonament').select('*'),
                    tipuriPlati: cleanedSupabase.from('tipuri_plati').select('*'),
                    sportiviRaw: cleanedSupabase.from('sportivi').select('*, cluburi(*)'),
                    sportiviRoles: cleanedSupabase.from('utilizator_roluri_multicont').select('sportiv_id, rol_denumire'),
                    sesiuniExamene: cleanedSupabase.from('sesiuni_examene').select('*'),
                    plati: cleanedSupabase.from('plati').select('*'),
                    tranzactii: cleanedSupabase.from('tranzactii').select('*'),
                    evenimente: cleanedSupabase.from('evenimente').select('*'),
                    rezultate: cleanedSupabase.from('rezultate').select('*'),
                    familii: cleanedSupabase.from('familii').select('*'),
                    vizualizarePlati: cleanedSupabase.from('view_plata_sportiv').select('*'),
                };

                if (!isSportiv) {
                    queries.locatii = cleanedSupabase.from('nom_locatii').select('*');
                    queries.reduceri = cleanedSupabase.from('reduceri').select('*');
                    queries.preturiConfig = cleanedSupabase.from('preturi_config').select('*');
                    queries.istoricPlatiDetaliat = cleanedSupabase.from('view_istoric_plati_detaliat').select('*');
                    queries.deconturiFederatie = cleanedSupabase.from('deconturi_federatie').select('*');
                }

                // Some tables might have RLS that allows SPORTIV to read their own records, but we'll fetch them and ignore errors if they fail, or just fetch them.
                if (isSportiv) {
                    queries.inscrieriExamene = cleanedSupabase.from('vedere_inscrieri_examene_sportiv').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)').eq('sportiv_id', activeCtx.sportiv_id);
                    queries.istoricGrade = cleanedSupabase.from('vedere_istoric_grade_sportiv').select('*').eq('sportiv_id', activeCtx.sportiv_id);
                    queries.plati = cleanedSupabase.from('plati').select('*').eq('sportiv_id', activeCtx.sportiv_id);
                    queries.vizualizarePlati = cleanedSupabase.from('view_plata_sportiv').select('*').eq('sportiv_id', activeCtx.sportiv_id);
                    // For antrenamente, they might only have access to their group's trainings or where they are present.
                    // We will let RLS handle antrenamente, or we can filter by grupa_id if needed, but usually RLS handles it.
                } else {
                    queries.inscrieriExamene = cleanedSupabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)');
                    queries.istoricGrade = cleanedSupabase.from('istoric_grade').select('*');
                }

                // Apply club filter if NOT super admin AND NOT admin club (let RLS handle it for them)
                if (!isSuperAdmin && !isAdminClub && cleanClubId) {
                    const tablesToFilter = [
                        'grupe', 'sportiviRaw', 'plati', 'tranzactii', 'evenimente', 
                        'familii', 'deconturiFederatie', 
                        'istoricGrade', 'vizualizarePlati',
                        'sesiuniExamene', 'inscrieriExamene', 'tipuriAbonament'
                    ];
                    tablesToFilter.forEach(key => {
                        if (queries[key]) {
                            queries[key] = queries[key].eq('club_id', cleanClubId);
                        }
                    });
                }

                const queryKeys = Object.keys(queries);
                const settledResults = await Promise.allSettled(Object.values(queries)) as any;
                const { data: processedData, rlsErrors } = processSettledQueries(settledResults, queryKeys);

                // Filter out RLS errors for tables that SPORTIV might not have access to but are not critical
                const criticalRlsErrors = isSportiv 
                    ? rlsErrors.filter(err => !['locatii', 'reduceri', 'preturiConfig', 'istoricPlatiDetaliat', 'deconturiFederatie', 'inscrieriExamene', 'istoricGrade'].includes(err))
                    : rlsErrors;

                if (criticalRlsErrors.length > 0) {
                    setError(`RLS Error: Access denied for ${criticalRlsErrors.join(', ')}`);
                }

                const { 
                    clubs: cData, allRoles: rData, grade: gData, grupe: grpData, tipuriAbonament: subData, 
                    locatii: locData, tipuriPlati: pTypeData, reduceri: redData, sportiviRaw: sRaw, 
                    sesiuniExamene: sessData, inscrieriExamene: regData, 
                    plati: payData, tranzactii: trData, evenimente: evData, rezultate: resData, 
                    familii: famData, preturiConfig: prcData, 
                    vizualizarePlati: vPayData, istoricPlatiDetaliat: istPayData, deconturiFederatie: decData, istoricGrade: istGData,
                    sportiviRoles: sRoles
                } = processedData;

                const allSportivi = (sRaw || []).map((s: any) => ({
                    ...s,
                    cluburi: s.cluburi || {},
                    roluri: (sRoles || [])
                        .filter((sr: any) => sr.sportiv_id === s.id)
                        .map((sr: any) => rData.find((r: any) => r.nume === sr.rol_denumire))
                        .filter(Boolean)
                }));

                setData({
                    clubs: cData, allRoles: rData, grade: gData, grupe: grpData, tipuriAbonament: subData,
                    locatii: locData, tipuriPlati: pTypeData, reduceri: redData, sportivi: allSportivi,
                    sesiuniExamene: sessData, inscrieriExamene: regData,
                    plati: payData, tranzactii: trData, evenimente: evData, rezultate: resData,
                    familii: famData, preturiConfig: prcData,
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
            setLoadingData(false);
        }
    }, [session?.user.id, session?.user.email, userRoles]);

    // Effect to trigger data fetch when active role context changes
    useEffect(() => {
        if (activeRoleContext) {
            fetchAppData(activeRoleContext);
        } else if (!rolesLoading && !needsRoleSelection) {
            // If roles loaded but no context (and not waiting for selection), stop loading
            setLoadingData(false);
        }
    }, [activeRoleContext, rolesLoading, needsRoleSelection, fetchAppData]);

    const initializeAndFetchData = useCallback(async () => {
        try {
            setLoadingData(true);
            setError(null);
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");

            let { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                setSession(null);
                setLoadingData(false);
                return;
            }

            setSession(currentSession);
            
            // Refresh roles if session exists
            refreshRoles();

        } catch (err: any) {
            console.error("Initialization Error:", err);
            setError(err.message);
            setLoadingData(false);
        }
    }, [refreshRoles]);

    useEffect(() => {
        initializeAndFetchData();
        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) initializeAndFetchData();
        });
        return () => subscription.unsubscribe();
    }, [initializeAndFetchData]);

    const createSetter = <K extends keyof AppData>(key: K) => 
        useCallback((value: React.SetStateAction<AppData[K]>) => {
            setData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as any)(prev[key]) : value }));
        }, []);

    const loading = loadingData || rolesLoading || attendanceData.loading;
    const combinedError = error || rolesError || attendanceData.error;

    return { 
        ...data, 
        filteredData,
        ...attendanceData,
        loading, 
        error: combinedError, 
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
        setVizualizarePlati: createSetter('vizualizarePlati'),
        loadingIstoric,
        fetchIstoricVedere,
        initializeAndFetchData // Expose for retry
    };
};
