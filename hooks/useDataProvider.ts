import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata,
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie,
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, VizualizarePlata, IstoricPlataDetaliat, VederePrezentaSportiv, FilteredData,
    TaxaAnualeConfig, VizaSportiv, DecontSportiv
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
import { usePermissions } from './usePermissions';
import { useFetchAllowedClubs } from './useClubAccess';
import { getCachedData, setCachedData } from '../utils/cache';

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
    taxeAnualeConfig: TaxaAnualeConfig[];
    vizeSportivi: VizaSportiv[];
    decontSportivi: DecontSportiv[];
    filteredData?: FilteredData;
    allowedClubs: string[];
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [], vizualizarePlati: [],
    istoricPlatiDetaliat: [], istoricPrezenta: [], taxeAnualeConfig: [], vizeSportivi: [], decontSportivi: [], allowedClubs: []
};

export const useDataProvider = () => {
    const [data, setData] = useState<AppData>(initialData);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingIstoric, setLoadingIstoric] = useState(false);
    const lastFetchedSportivId = React.useRef<string | null>(null);
    const currentSessionUserIdRef = React.useRef<string | null>(null);
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

    // Derive active role for filtering (fallback to rol_denumire if rol_id was not set)
    const activeRole = activeRoleContext?.roluri?.nume || activeRoleContext?.rol_denumire || null;
    const permissions = usePermissions(activeRoleContext);
    const { allowedClubs, loading: accessLoading } = useFetchAllowedClubs();

    const attendanceData = useAttendanceData();

    // SUPER_ADMIN_FEDERATIE și ADMIN văd toate grupele; ceilalți văd doar grupele clubului lor
    const grupeClubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);

    // Use custom hooks for data fetching
    // Pentru non-federation admin, filtrăm sportivii la nivel de query după clubul activ
    const sportiviClubId = permissions.isFederationLevel ? undefined : (activeRoleContext?.club_id ?? undefined);
    const { data: sportiviData, isLoading: sportiviLoading, error: sportiviError } = useSportivi(
        { clubId: sportiviClubId },
        undefined,
        undefined,
        activeRoleContext?.id
    );
    const { data: platiData, isLoading: platiLoading, error: platiError } = usePlati(activeRoleContext?.id);
    const { data: grupeData, isLoading: grupeLoading, error: grupeError } = useGrupe(activeRoleContext?.id, grupeClubId);

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
        activeClubId: activeRoleContext?.club_id ?? null,
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
                .from('vedere_prezenta_detaliata')
                .select('*')
                .eq('sportiv_id', sportivId)
                .order('data', { ascending: false });

            // Dacă view-ul nu există (404) sau avem altă eroare, facem fallback pe tabelele de bază
            if (fetchErr) {
                console.warn("View 'vedere_prezenta_detaliata' not found or error, falling back to base tables:", fetchErr.message);
                
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
                        data: (row.antrenament?.data || '').toString().slice(0, 10),
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
                .channel(`prezenta_antrenament_changes_${currentUser.id}`)
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
            
            const isStaff = activeRole === 'INSTRUCTOR' || activeRole === 'ADMIN_CLUB' || activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN_FEDERATIE';
            const clubId = currentUser?.club_id;
            const anunturiSubscription = isStaff && clubId
                ? supabase
                    .channel(`anunturi_prezenta_changes_${currentUser.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'anunturi_prezenta',
                            filter: `club_id=eq.${clubId}`
                        },
                        async (payload) => {
                            const record = payload.new as any;
                            if (!record?.sportiv_id || !record?.status) return;

                            const statusLabel: Record<string, { msg: string; icon: string }> = {
                                'Confirm':   { msg: 'confirmă prezența',  icon: '✅' },
                                'Intarziat': { msg: 'va întârzia',         icon: '⏰' },
                                'Absent':    { msg: 'va absenta',          icon: '❌' },
                            };
                            const { msg, icon } = statusLabel[record.status] ?? { msg: record.status, icon: '📋' };

                            const { data: sportivData } = await supabase
                                .from('sportivi')
                                .select('nume, prenume')
                                .eq('id', record.sportiv_id)
                                .maybeSingle();

                            const numeSportiv = sportivData
                                ? `${sportivData.prenume} ${sportivData.nume}`
                                : 'Un sportiv';

                            const toastFn = record.status === 'Absent' ? toast.error
                                : record.status === 'Intarziat' ? toast
                                : toast.success;

                            if (record.status === 'Intarziat') {
                                toast(`${icon} ${numeSportiv} ${msg}`, {
                                    icon: '⏰',
                                    style: { background: '#78350f', color: '#fef3c7', border: '1px solid #d97706' }
                                });
                            } else if (record.status === 'Absent') {
                                toast.error(`${icon} ${numeSportiv} ${msg}`);
                            } else {
                                toast.success(`${icon} ${numeSportiv} ${msg}`);
                            }
                        }
                    )
                    .subscribe()
                : null;

            return () => {
                supabase.removeChannel(subscription);
                if (anunturiSubscription) supabase.removeChannel(anunturiSubscription);
            };
        }
    }, [currentUser?.id, currentUser?.club_id, fetchIstoricVedere, activeRole]);

    const fetchAppData = useCallback(async (activeCtx: any) => {
        try {
            setLoadingData(true);
            setError(null);
            
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");
            
            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);
            const profile = activeCtx.sportiv || (userRoles || []).find(r => r.sportiv)?.sportiv;

            const currentRoles = (userRoles || []).map((r: any) => ({
                ...r.roluri,
                id: r.id, // Use assignment ID for uniqueness
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
                cluburi: activeCtx.cluburi
            } as any);

            const activeRoleName = activeCtx.roluri?.nume || activeCtx.rol_denumire;
            const isSuperAdmin = activeRoleName === 'SUPER_ADMIN_FEDERATIE';
            const isAdmin = activeRoleName === 'ADMIN';
            const isSportiv = activeRoleName === 'SPORTIV';
            const isFederationLevel = isSuperAdmin || isAdmin;

            // Helper: adaugă filtru club_id la query dacă utilizatorul nu e la nivel federație
            const clubId = (!isFederationLevel && activeCtx.club_id) ? activeCtx.club_id : null;
            const withClub = (query: any) => clubId ? query.eq('club_id', clubId) : query;

            const cacheKeys: Record<string, string> = {
                clubs: 'cache_clubs',
                allRoles: 'cache_allRoles',
                grade: 'cache_grade',
                tipuriPlati: 'cache_tipuriPlati',
            };

            // Critical queries — blochează UI până sunt gata
            const criticalQueries: Record<string, any> = {
                clubs: cleanedSupabase.from('cluburi').select('id, nume, cif, oras, theme_config'),
                allRoles: cleanedSupabase.from('roluri').select('id, nume'),
                grade: cleanedSupabase.from('grade').select('*'),
                tipuriPlati: cleanedSupabase.from('tipuri_plati').select('id, nume'),
                tipuriAbonament: withClub(cleanedSupabase.from('tipuri_abonament').select('id, denumire, pret, club_id, numar_membri')),
                sesiuniExamene: withClub(cleanedSupabase.from('sesiuni_examene').select('*')),
                familii: withClub(cleanedSupabase.from('familii').select('*')),
                vizualizarePlati: withClub(cleanedSupabase.from('view_plata_sportiv').select('*')),
                locatii: withClub(cleanedSupabase.from('nom_locatii').select('*')),
                evenimente: withClub(cleanedSupabase.from('evenimente').select('*')),
                taxeAnualeConfig: withClub(cleanedSupabase.from('taxe_anuale_config').select('*')),
            };

            // Deferred queries — se încarcă în background după ce UI-ul e gata
            const deferredQueries: Record<string, any> = {
                reduceri: cleanedSupabase.from('reduceri').select('*'),
                rezultate: cleanedSupabase.from('rezultate').select('*'),
                tranzactii: cleanedSupabase.from('tranzactii').select('*'),
                istoricPlatiDetaliat: cleanedSupabase.from('view_istoric_plati_detaliat').select('*'),
                deconturiFederatie: withClub(cleanedSupabase.from('deconturi_federatie').select('*')),
                vizeSportivi: cleanedSupabase.from('vize_sportivi').select('*'),
                decontSportivi: cleanedSupabase.from('decont_sportivi').select('*'),
            };

            // Check cache for static data
            const cachedResults: Record<string, any> = {};
            for (const [key, cacheKey] of Object.entries(cacheKeys)) {
                const cached = getCachedData(cacheKey);
                if (cached) {
                    cachedResults[key] = cached;
                    delete criticalQueries[key];
                }
            }

            if (isSportiv && activeCtx.sportiv_id) {
                criticalQueries.inscrieriExamene = cleanedSupabase.from('vedere_detalii_examen').select('*, id:inscriere_id').eq('sportiv_id', activeCtx.sportiv_id);
                criticalQueries.istoricGrade = cleanedSupabase.from('vedere_istoric_grade_sportiv').select('*').eq('sportiv_id', activeCtx.sportiv_id);
            } else {
                criticalQueries.inscrieriExamene = clubId
                    ? cleanedSupabase.from('vedere_detalii_examen').select('*, id:inscriere_id').eq('club_id', clubId)
                    : cleanedSupabase.from('vedere_detalii_examen').select('*, id:inscriere_id');
                criticalQueries.istoricGrade = cleanedSupabase.from('vedere_istoric_grade_sportiv').select('*');
            }

            const criticalKeys = Object.keys(criticalQueries);
            const criticalSettled = await Promise.allSettled(Object.values(criticalQueries)) as SettledQuery[];

            const { data: criticalData, rlsErrors } = processSettledQueries(criticalSettled, criticalKeys);
            const finalData = { ...criticalData, ...cachedResults };

            // Update cache for newly fetched static data
            criticalSettled.forEach((result, index) => {
                const key = criticalKeys[index];
                if (result.status === 'fulfilled' && cacheKeys[key]) {
                    const rawData = result.value?.data;
                    if (rawData && rawData.length > 0) {
                        setCachedData(cacheKeys[key], rawData);
                    }
                }
            });

            const criticalRlsErrors = isSportiv
                ? rlsErrors.filter(err => !['locatii', 'reduceri', 'preturiConfig', 'istoricPlatiDetaliat', 'deconturiFederatie'].includes(err))
                : rlsErrors;

            if (criticalRlsErrors.length > 0) {
                setError(`Eroare Acces (RLS): ${criticalRlsErrors.join(', ')}`);
            }

            setData(prev => ({
                ...prev,
                clubs: finalData.clubs?.length ? finalData.clubs : prev.clubs,
                allRoles: finalData.allRoles?.length ? finalData.allRoles : prev.allRoles,
                grade: finalData.grade?.length ? finalData.grade : prev.grade,
                tipuriAbonament: finalData.tipuriAbonament?.length ? finalData.tipuriAbonament : prev.tipuriAbonament,
                locatii: finalData.locatii || prev.locatii,
                tipuriPlati: finalData.tipuriPlati || prev.tipuriPlati,
                sesiuniExamene: finalData.sesiuniExamene || prev.sesiuniExamene,
                evenimente: finalData.evenimente || prev.evenimente,
                familii: finalData.familii || prev.familii,
                vizualizarePlati: finalData.vizualizarePlati || prev.vizualizarePlati,
                inscrieriExamene: finalData.inscrieriExamene || prev.inscrieriExamene,
                istoricGrade: finalData.istoricGrade || prev.istoricGrade,
                taxeAnualeConfig: finalData.taxeAnualeConfig || prev.taxeAnualeConfig,
            }));

            // Încarcă date secundare în background — nu blochează UI
            Promise.allSettled(Object.values(deferredQueries)).then((deferredSettled) => {
                const deferredKeys = Object.keys(deferredQueries);
                const { data: deferredData } = processSettledQueries(deferredSettled as SettledQuery[], deferredKeys);
                setData(prev => ({
                    ...prev,
                    reduceri: deferredData.reduceri || prev.reduceri,
                    rezultate: deferredData.rezultate || prev.rezultate,
                    tranzactii: deferredData.tranzactii || prev.tranzactii,
                    istoricPlatiDetaliat: deferredData.istoricPlatiDetaliat || prev.istoricPlatiDetaliat,
                    deconturiFederatie: deferredData.deconturiFederatie || prev.deconturiFederatie,
                    vizeSportivi: deferredData.vizeSportivi || prev.vizeSportivi,
                    decontSportivi: deferredData.decontSportivi || prev.decontSportivi,
                }));
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingData(false);
        }
    }, [session?.user.id, userRoles]);

    useEffect(() => {
        if (activeRoleContext) {
            fetchAppData(activeRoleContext);
        } else if (!rolesLoading && !needsRoleSelection) {
            setLoadingData(false);
        }
    }, [activeRoleContext, rolesLoading, needsRoleSelection, fetchAppData]);

    // Ref stabil pentru refreshRoles — previne re-rularea efectului de auth
    // când useUserRoles recreează funcția după ce rolurile sunt încărcate
    const refreshRolesRef = React.useRef(refreshRoles);
    useEffect(() => { refreshRolesRef.current = refreshRoles; }, [refreshRoles]);

    const initializeAndFetchData = useCallback(async () => {
        try {
            setLoadingData(true);
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
            if (currentSession) {
                currentSessionUserIdRef.current = currentSession.user.id;
                refreshRolesRef.current();
            }
            setLoadingData(false);
        } catch (err: any) {
            setError(err.message);
            setLoadingData(false);
        }
    }, []); // stabil — nu depinde de refreshRoles direct

    useEffect(() => {
        initializeAndFetchData();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
            if (event === 'SIGNED_IN') {
                const incomingUserId = sess?.user?.id ?? null;
                setSession(sess);
                // Refresh roles only if this is a genuinely new user session.
                // If the user ID matches what we already have loaded, this is a
                // session recovery or token refresh event – skip re-fetching to
                // prevent unwanted page reloads when returning to the tab.
                if (incomingUserId && incomingUserId !== currentSessionUserIdRef.current) {
                    currentSessionUserIdRef.current = incomingUserId;
                    refreshRolesRef.current();
                }
            } else if (event === 'SIGNED_OUT') {
                currentSessionUserIdRef.current = null;
                setSession(null);
            }
        });
        return () => subscription.unsubscribe();
    }, []); // rulat o singură dată — ref-ul asigură că refreshRoles e mereu curent

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
        setTaxeAnualeConfig: createSetter('taxeAnualeConfig'),
        setVizeSportivi: createSetter('vizeSportivi'),
        setDecontSportivi: createSetter('decontSportivi'),
        loadingIstoric,
        fetchIstoricVedere,
        initializeAndFetchData 
    };
};