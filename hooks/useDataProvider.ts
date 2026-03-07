import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata, 
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, 
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, VizualizarePlata, IstoricPlataDetaliat, VederePrezentaSportiv, FilteredData
} from '../types';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { withCleanUuidFilters } from '../utils/supabaseFilters';
import { processSettledQueries, SettledQuery } from '../utils/supabaseHelpers';
import { useUserRoles } from './useUserRoles';
import { useFilteredData } from './useFilteredData';
import { useAttendanceData } from './useAttendanceData';
import { useSportivi } from './useSportivi';
import { usePlati } from './usePlati';
import { useGrupe } from './useGrupe';
import { useClubFilter } from './useClubFilter';
import { usePermissions } from './usePermissions';
import { useFetchAllowedClubs } from './useClubAccess';

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
    istoricPrezenta: VederePrezentaSportiv[];
    filteredData?: FilteredData;
    allowedClubs: string[];
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [], vizualizarePlati: [],
    istoricPlatiDetaliat: [], istoricPrezenta: [], allowedClubs: []
};

export const useDataProvider = () => {
    const [data, setData] = useState<AppData>(initialData);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingIstoric, setLoadingIstoric] = useState(false);
    const lastFetchedSportivId = React.useRef<string | null>(null);
    const [isAuthInitialized, setIsAuthInitialized] = useState(false);
    const canFetch = !!session?.user && isAuthInitialized;

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
    const permissions = usePermissions(activeRoleContext);
    const { allowedClubs, loading: accessLoading } = useFetchAllowedClubs();
    const { activeClubId, globalClubFilter, setGlobalClubFilter } = useClubFilter(currentUser, permissions, allowedClubs, accessLoading);

    const attendanceData = useAttendanceData(activeClubId);

    // Use custom hooks for data fetching
    const { data: sportiviData, isLoading: sportiviLoading, error: sportiviError } = useSportivi(activeClubId);
    const { data: platiData, isLoading: platiLoading, error: platiError } = usePlati(activeClubId);
    const { data: grupeData, isLoading: grupeLoading, error: grupeError } = useGrupe(activeClubId);

    // Update state when data changes de la hook-urile secundare
    useEffect(() => {
        setData(prev => ({
            ...prev,
            sportivi: sportiviData || prev.sportivi,
            plati: platiData || prev.plati,
            grupe: grupeData || prev.grupe
        }));
    }, [sportiviData, platiData, grupeData]);

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
        istoricPlatiDetaliat: data.istoricPlatiDetaliat,
        locatii: data.locatii
    });

    const fetchIstoricVedere = useCallback(async (sportivId: string, silent = false) => {
        if (!sportivId) return;
        lastFetchedSportivId.current = sportivId;
        if (!silent) setLoadingIstoric(true);
        
        try {
            // Încercăm să citim din view-ul optimizat
            let { data: result, error: fetchErr } = await supabase
                .from('vedere_prezenta_sportiv')
                .select('*')
                .eq('sportiv_id', sportivId)
                .order('data', { ascending: false });

            // Dacă view-ul nu există (404) sau avem altă eroare, facem fallback pe tabelele de bază
            if (fetchErr) {
                console.warn("View 'vedere_prezenta_sportiv' not found or error, falling back to base tables:", fetchErr.message);
                
                const { data: fallbackData, error: fallbackErr } = await supabase
                    .from('prezenta_antrenament')
                    .select(`
                        status,
                        sportiv_id,
                        antrenament:antrenament_id (
                            id,
                            data,
                            ora_start,
                            club_id,
                            grupa:grupa_id (
                                id,
                                denumire
                            )
                        )
                    `)
                    .eq('sportiv_id', sportivId)
                    .order('antrenament_id', { ascending: false });

                if (!fallbackErr && fallbackData) {
                    // Mapăm datele pentru a respecta structura VederePrezentaSportiv
                    const mappedData: VederePrezentaSportiv[] = fallbackData.map((row: any) => ({
                        antrenament_id: row.antrenament?.id,
                        id: row.antrenament?.id,
                        sportiv_id: row.sportiv_id,
                        data: row.antrenament?.data,
                        status: row.status,
                        club_id: row.antrenament?.club_id,
                        grupa_id: row.antrenament?.grupa?.id,
                        ora_start: row.antrenament?.ora_start,
                        nume_grupa: row.antrenament?.grupa?.denumire
                    }));
                    setData(prev => ({ ...prev, istoricPrezenta: mappedData }));
                }
            } else if (result) {
                setData(prev => ({ ...prev, istoricPrezenta: result }));
            }
        } finally {
            if (!silent) setLoadingIstoric(false);
        }
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

    const fetchAppData = useCallback(async (activeCtx: any) => {
        try {
            setLoadingData(true);
            setError(null);
            
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");
            
            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);
            let cleanClubId = activeCtx.club_id || activeClubId;
            if (cleanClubId === 'null' || cleanClubId === 'undefined') {
                cleanClubId = null;
            }
            const profile = activeCtx.sportiv || (userRoles || []).find(r => r.sportiv)?.sportiv;

            const currentRoles = (userRoles || []).map((r: any) => ({
                ...r.roluri,
                assignment_id: r.id 
            })).filter(role => role && role.nume);
            
            setCurrentUser({
                ...(profile || {
                    id: session?.user.id,
                    user_id: session?.user.id,
                    email: session?.user.email,
                    nume: 'Utilizator',
                    prenume: 'Sistem',
                }),
                roluri: currentRoles,
                club_id: cleanClubId,
                cluburi: activeCtx.cluburi
            } as any);

            const activeRoleName = activeCtx.roluri?.nume;
            const isSuperAdmin = activeRoleName === 'SUPER_ADMIN_FEDERATIE';
            const isAdminClub = activeRoleName === 'ADMIN_CLUB';
            const isSportiv = activeRoleName === 'SPORTIV';

            const queries: Record<string, any> = {
                clubs: cleanedSupabase.from('cluburi').select('*'),
                allRoles: cleanedSupabase.from('roluri').select('*'),
                grade: cleanedSupabase.from('grade').select('*'),
                tipuriAbonament: cleanedSupabase.from('tipuri_abonament').select('*'),
                tipuriPlati: cleanedSupabase.from('tipuri_plati').select('*'),
                sesiuniExamene: cleanedSupabase.from('sesiuni_examene').select('*'),
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

            if (isSportiv && activeCtx.sportiv_id) {
                queries.inscrieriExamene = cleanedSupabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)').eq('sportiv_id', activeCtx.sportiv_id);
                queries.istoricGrade = cleanedSupabase.from('istoric_grade').select('*').eq('sportiv_id', activeCtx.sportiv_id);
            } else {
                queries.inscrieriExamene = cleanedSupabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)');
                queries.istoricGrade = cleanedSupabase.from('istoric_grade').select('*');
            }

            if (!isSuperAdmin && cleanClubId) {
                const tablesToFilter = ['tranzactii', 'evenimente', 'deconturiFederatie', 'vizualizarePlati', 'sesiuniExamene', 'tipuriAbonament'];
                tablesToFilter.forEach(key => {
                    if (queries[key]) queries[key] = queries[key].eq('club_id', cleanClubId);
                });
            }

            const queryKeys = Object.keys(queries);
            const settledResults = await Promise.allSettled(Object.values(queries)) as SettledQuery[];
            const { data: processedData, rlsErrors } = processSettledQueries(settledResults, queryKeys);

            const criticalRlsErrors = isSportiv 
                ? rlsErrors.filter(err => !['locatii', 'reduceri', 'preturiConfig', 'istoricPlatiDetaliat', 'deconturiFederatie'].includes(err))
                : rlsErrors;

            if (criticalRlsErrors.length > 0) {
                setError(`Eroare Acces (RLS): ${criticalRlsErrors.join(', ')}`);
            }

            setData(prev => ({
                ...prev,
                clubs: processedData.clubs || prev.clubs,
                allRoles: processedData.allRoles || prev.allRoles,
                grade: processedData.grade || prev.grade,
                tipuriAbonament: processedData.tipuriAbonament || prev.tipuriAbonament,
                locatii: processedData.locatii || prev.locatii,
                tipuriPlati: processedData.tipuriPlati || prev.tipuriPlati,
                reduceri: processedData.reduceri || prev.reduceri,
                sesiuniExamene: processedData.sesiuniExamene || prev.sesiuniExamene,
                inscrieriExamene: processedData.inscrieriExamene || prev.inscrieriExamene,
                tranzactii: processedData.tranzactii || prev.tranzactii,
                evenimente: processedData.evenimente || prev.evenimente,
                rezultate: processedData.rezultate || prev.rezultate,
                familii: processedData.familii || prev.familii,
                preturiConfig: processedData.preturiConfig || prev.preturiConfig,
                vizualizarePlati: processedData.vizualizarePlati || prev.vizualizarePlati,
                istoricPlatiDetaliat: processedData.istoricPlatiDetaliat || prev.istoricPlatiDetaliat,
                deconturiFederatie: processedData.deconturiFederatie || prev.deconturiFederatie,
                istoricGrade: processedData.istoricGrade || prev.istoricGrade
            }));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingData(false);
        }
    }, [session?.user.id, userRoles, activeClubId]);

    useEffect(() => {
        if (activeRoleContext) {
            fetchAppData(activeRoleContext);
        } else if (!rolesLoading && !needsRoleSelection) {
            setLoadingData(false);
        }
    }, [activeRoleContext, rolesLoading, needsRoleSelection, fetchAppData]);

    const initializeAndFetchData = useCallback(async () => {
        try {
            setLoadingData(true);
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
            if (currentSession) refreshRoles();
            else setLoadingData(false);
        } catch (err: any) {
            setError(err.message);
            setLoadingData(false);
        }
    }, [refreshRoles]);

    useEffect(() => {
        initializeAndFetchData();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
            setSession(sess);
            if (sess) refreshRoles();
        });
        return () => subscription.unsubscribe();
    }, [initializeAndFetchData, refreshRoles]);

    const createSetter = <K extends keyof AppData>(key: K) => 
        useCallback((value: React.SetStateAction<AppData[K]>) => {
            setData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as any)(prev[key]) : value }));
        }, []);

    const loading = loadingData || rolesLoading || attendanceData.loading || accessLoading;
    const combinedError = error || rolesError || attendanceData.error;

    return { 
        ...data, 
        filteredData,
        ...attendanceData,
        allowedClubs,
        loading, 
        error: combinedError, 
        needsRoleSelection, 
        session, 
        currentUser, 
        userRoles, 
        activeRoleContext, 
        activeClubId,
        setGlobalClubFilter,
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
        initializeAndFetchData 
    };
};